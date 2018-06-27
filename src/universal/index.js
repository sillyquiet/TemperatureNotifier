import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import registerServiceWorker from "./registerServiceWorker";
import ApolloClient from "apollo-boost";
import { ApolloProvider } from "react-apollo";

const client = new ApolloClient({
    uri: "http://raspberrypi:4000/graphql"
});

const Root = (
    <ApolloProvider client={client}>
        <App />
    </ApolloProvider>
);
ReactDOM.render(Root, document.getElementById("root"));
registerServiceWorker();
