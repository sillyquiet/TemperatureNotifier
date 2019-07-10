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
const { getExternalReading, initSensors } = require("./device/sensors");
const FAN_STATE_OFF = "OFF";
const FAN_STATE_ON = "ON";
const FAN_STATE_AUTO = "AUTO";
const FAN_STATES = [FAN_STATE_OFF, FAN_STATE_ON, FAN_STATE_AUTO];

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
    currentFanState: String
    currentFanControlState: String
    allFanControlStates: [String]
    setPoint: Float
}

type Mutation {
    toggleFans (fanState: String): String
    setSetPoint (setPoint: Float): Float
}

type Subscription {
    updatedTemp: Query 
}

schema {
  query: Query
  subscription: Subscription
  mutation: Mutation
}`
];

let timer;

const tempsAreEqual = (a, b, precision = 1) =>
    new Number(a).toFixed(precision).toString() !==
    new Number(b).toFixed(precision).toString();

let counter;
let setPoint = 100.0;
let fanState = FAN_STATE_OFF;
let fanControlState = FAN_STATE_AUTO;

const readLoop = () => {
    counter = 0;
    timer = setInterval(async () => {
        counter++;
        const externalTemperature = await getExternalReading();
        const temperatureDifference = setPoint - externalTemperature.celsius;
        const fanLoop = counter !== 0 && counter % 10 === 0;
        const isFanControlOn = fanControlState === FAN_STATE_ON;
        const isFanControlOff = fanControlState === FAN_STATE_OFF;
        const isFanControlAuto = fanControlState === FAN_STATE_AUTO;
        if (
            fanLoop &&
            (isFanControlOn || (isFanControlAuto && temperatureDifference < 0))
        ) {
            fansOn();
            fanState = FAN_STATE_ON;
            counter = 0;
        } else if (
            fanLoop &&
            (isFanControlOff ||
                (isFanControlAuto && temperatureDifference >= 0))
        ) {
            fansOff();
            fanState = FAN_STATE_OFF;
            counter = 0;
        }

        const updatedTemp = {
            temperature: externalTemperature,
            timestamp: new Date().toUTCString(),
            fansAreOn: fansAreOn(),
            allFanControlStates: FAN_STATES
        };
        const success = pubsub.publish("tempUpdated", { updatedTemp });
        console.log("Published: ", success, updatedTemp);
    }, 1000);
};

const resolvers = {
    Query: {
        temperature() {
            return getExternalReading();
        },
        timestamp() {
            return new Date().toUTCString();
        },
        currentFanState() {
            return fanState;
        },
        currentFanControlState() {
            return fanControlState;
        },
        allFanControlStates() {
            return FAN_STATES;
        }
    },
    Mutation: {
        toggleFans(_, args) {
            const { fanState } = args;
            fanControlState = fanState;
            return fanControlState;
        },
        setSetPoint(_, args) {
            const { setPoint: newSetPoint } = args;
            setPoint = newSetPointl;
            return setPoint;
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
