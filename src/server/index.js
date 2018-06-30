const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const { makeExecutableSchema } = require("graphql-tools");
const { PubSub } = require("graphql-subscriptions");
const { execute, subscribe } = require("graphql");
const { createServer } = require("http");
const { SubscriptionServer } = require("subscriptions-transport-ws");

const pubsub = new PubSub();

const deviceName = "28-0117b2112cff";

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

const getReading = async () => {
    try {
        return await readSensorHW();
    } catch (err) {
        console.log(err.message);
        return {};
    }
};

const readLoop = () => {
    timer = setInterval(async () => {
        const temperature = await getReading();
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

const readSensorHW = () => {
    return new Promise((resolve, reject) => {
        const sensor_path = `/sys/bus/w1/devices/${deviceName}/w1_slave`;
        // const sensor_path = "src/server/sensorMock";

        try {
            fs.accessSync(sensor_path, fs.constants.F_OK | fs.constants.R_OK);
            fs.readFile(sensor_path, { encoding: "utf8" }, (err, data) => {
                if (err) {
                    throw err;
                }
                if (!data) {
                    throw "No sensor data";
                }
                const lines = data.split("\n");
                if (lines.length < 2) {
                    throw `Invalid sensor data: ${data}`;
                }
                if (!lines[0].match(/ YES$/)) {
                    throw `Checksum error reading sensor ${name}`;
                }

                const temp_pattern = /t=-?\d*/;
                let temp_string = temp_pattern.exec(lines[1]);
                if (temp_string === null) {
                    throw `Parsing error reading sensor ${name}`;
                }
                temp_string = String(temp_string).substr(2);
                const celsius = parseFloat(temp_string) / 1000;

                const fahrenheit = celsius * 1.8 + 32;

                resolve({ celsius, fahrenheit });
            });
        } catch (err) {
            reject(err);
            return;
        }
    });
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
