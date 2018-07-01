const express = require("express");
const bodyParser = require("body-parser");

const cors = require("cors");

const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const { makeExecutableSchema } = require("graphql-tools");
const { PubSub } = require("graphql-subscriptions");
const { execute, subscribe } = require("graphql");
const { createServer } = require("http");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { initFans, fansOff, fansOn } = require("./device/fans");
const { getReading } = require("./device/sensors");

const pubsub = new PubSub();

const typeDefs = [
    `

type Temperature {
    celsius: Float
    fahrenheit: Float
}

type Query {
    temperature: Temperature
    timestamp: String
}

type Subscription {
    updatedTemp: Query 
}

schema {
  query: Query
  subscription: Subscription
}`
];
let timer;

const timestamp = () => new Date().toUTCString();
const compareTemps = (a, b) =>
    new Number(a).toFixed(1).toString() !== new Number(b).toFixed(1).toString();
let prevReading;

let counter;
const THRESHOLD = 25.0;

const readLoop = () => {
    counter = 0;
    timer = setInterval(async () => {
        counter++;
        const temperature = await getReading();
        const fanLoop = counter !== 0 && counter % 10 === 0;
        if (fanLoop && temperature.celsius > THRESHOLD) {
            fansOn();
        } else if (fanLoop && temperature.celsius <= THRESHOLD) {
            fansOff();
        }
        if (compareTemps(temperature.celsius, prevReading)) {
            prevReading = temperature.celsius;
            const updatedTemp = {
                temperature,
                timestamp: new Date().toUTCString()
            };
            const success = pubsub.publish("tempUpdated", { updatedTemp });
            console.log("Published: ", success, updatedTemp);
        }
    }, 1000);
};

const resolvers = {
    Query: {
        temperature() {
            return getReading();
        },
        timestamp() {
            return new Date().toUTCString();
        }
    },
    Subscription: {
        updatedTemp: {
            subscribe: () => pubsub.asyncIterator("tempUpdated")
        }
    }
};
var corsOptions = {
    origin: "*",
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
const schema = makeExecutableSchema({ typeDefs, resolvers });
const PORT = 4000;
const server = express();

server.use("*", cors(corsOptions));

server.use(
    "/graphql",
    bodyParser.json(),
    graphqlExpress({
        schema
    })
);

server.use(
    "/graphiql",
    graphiqlExpress({
        endpointURL: "/graphql",
        subscriptionsEndpoint: `ws://raspberrypi:${PORT}/subscriptions`
    })
);

// Wrap the Express server
const ws = createServer(server);

initFans();

ws.listen(PORT, () => {
    console.log(`Apollo Server is now running on http://raspberrypi:${PORT}`);

    readLoop();
    // Set up the WebSocket for handling GraphQL subscriptions
    new SubscriptionServer(
        {
            execute,
            subscribe,
            schema
        },
        {
            server: ws,
            path: "/subscriptions"
        }
    );
});
