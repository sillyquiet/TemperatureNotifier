const express = require("express");
const bodyParser = require("body-parser");

const cors = require("cors");

const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const { makeExecutableSchema } = require("graphql-tools");
const { PubSub } = require("graphql-subscriptions");
const { execute, subscribe } = require("graphql");
const { createServer } = require("http");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { initFans, fansOff, fansOn, fansAreOn } = require("./device/fans");
const {
    getInternalReading,
    getExternalReading,
    initSensors
} = require("./device/sensors");

const pubsub = new PubSub();

const typeDefs = [
    `

type Temperature {
    celsius: Float
    fahrenheit: Float
}

type Query {
    internalTemperature: Temperature
    externalTemperature: Temperature
    timestamp: String
    fansAreOn: Boolean
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
const tempsAreEqual = (a, b) =>
    new Number(a).toFixed(1).toString() !== new Number(b).toFixed(1).toString();

let prevReading;

let counter;
const THRESHOLD = 12.0;

const readLoop = () => {
    counter = 0;
    timer = setInterval(async () => {
        counter++;
        const internalTemperature = await getInternalReading();
        const externalTemperature = await getExternalReading();
        const temperatureDiffence =
            internalTemperature.celsius - externalTemperature.celsius;
        const fanLoop = counter !== 0 && counter % 10 === 0;
        if (fanLoop && temperatureDiffence > THRESHOLD) {
            fansOn();
        } else if (fanLoop && temperatureDiffence <= THRESHOLD) {
            fansOff();
        }
        prevReading = internalTemperature.celsius;
        const updatedTemp = {
            internalTemperature,
            externalTemperature,
            timestamp: new Date().toUTCString(),
            fansAreOn: fansAreOn()
        };
        const success = pubsub.publish("tempUpdated", { updatedTemp });
        console.log("Published: ", success, updatedTemp);
    }, 1000);
};

const resolvers = {
    Query: {
        internalTemperature() {
            return getInternalReading();
        },
        externalTemperature() {
            return getExternalReading();
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
initSensors();

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
