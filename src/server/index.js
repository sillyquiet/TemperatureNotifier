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
    new Number(a).toFixed(3).toString() !== new Number(b).toFixed(3).toString();
let prevReading;

const getReading = async () => {
    const temperature = await readSensorHW();
    const reading = { temperature, timestamp: timestamp() };
    return reading;
};

const readLoop = async () => {
    timer = setInterval(async () => {
        const reading = await getReading();
        if (compareTemps(reading.temperature.celsius, prevReading)) {
            prevReading = reading.temperature.celsius;
            const success = pubsub.publish("tempUpdated", {
                updatedTemp: reading
            });
            console.log("Published:", success);
        }
    }, 1000);
};

const readSensorHW = () => {
    return new Promise((resolve, reject) => {
        const sensor_path = `/sys/bus/w1/devices/${deviceName}/w1_slave`;
        // const sensor_path = "src/server/sensorMock";

        fs.access(sensor_path, fs.constants.R_OK, err => {
            if (err) {
                reject(`${sensor_path} cannot be accessed: ${err}`);
            }
            fs.readFile(sensor_path, { encoding: "utf8" }, (err, data) => {
                if (err) {
                    reject(err);
                }
                const lines = data.split("\n");
                if (lines.length < 2) {
                    reject(`Invalid sensor data: ${data}`);
                }
                if (!lines[0].match(/ YES$/)) {
                    reject(`Checksum error reading sensor ${name}`);
                }

                const temp_pattern = /t=-?\d*/;
                let temp_string = temp_pattern.exec(lines[1]);
                if (temp_string === null) {
                    reject(`Parsing error reading sensor ${name}`);
                }
                temp_string = String(temp_string).substr(2);
                const celsius = parseFloat(temp_string) / 1000;

                const fahrenheit = celsius * 1.8 + 32;

                resolve({ celsius, fahrenheit });
            });
        });
    });
};

const resolvers = {
    Query: {
        temperature() {
            try {
                return readSensorHW();
            } catch (err) {
                console.log(err);
                return null;
            }
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
