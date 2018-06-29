import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import registerServiceWorker from "./registerServiceWorker";
import ApolloClient from "apollo-client";
import { ApolloProvider } from "react-apollo";
import { InMemoryCache } from "apollo-cache-inmemory";
import { WebSocketLink } from "apollo-link-ws";
import { split } from "apollo-link";
import { HttpLink } from "apollo-link-http";
import { getMainDefinition } from "apollo-utilities";

const HOST = "raspberrypi";
const PORT = 4000;

const wsLink = new WebSocketLink({
    uri: `ws://${HOST}:${PORT}/subscriptions`,
    options: {
        reconnect: true
    }
});

// Create an http link:
const httpLink = new HttpLink({
    uri: `http://${HOST}:${PORT}/graphql`
});

console.log(`Looking for services on port ${PORT}`);

const link = split(
    // split based on operation type
    ({ query }) => {
        const { kind, operation } = getMainDefinition(query);
        return kind === "OperationDefinition" && operation === "subscription";
    },
    wsLink,
    httpLink
);

const client = new ApolloClient({ link, cache: new InMemoryCache() });

const Root = (
    <ApolloProvider client={client}>
        <App />
    </ApolloProvider>
);
ReactDOM.render(Root, document.getElementById("root"));
registerServiceWorker();
