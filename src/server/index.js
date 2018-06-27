const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const { makeExecutableSchema } = require("graphql-tools");
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

schema {
  query: Query
}`
];

const FAHRENHEIT = "fahrenheit";
const CELSIUS = "celsius";

const readSensorHW = (unit = CELSIUS) => {
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
            return readSensorHW();
        },
        timestamp() {
            return new Date().toUTCString();
        }
    }
};
var corsOptions = {
    origin: "*",
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
const schema = makeExecutableSchema({ typeDefs, resolvers });
const app = express();
app.use(
    "/graphql",
    cors(corsOptions),
    bodyParser.json(),
    graphqlExpress({ schema })
);
app.use("/graphiql", graphiqlExpress({ endpointURL: "/graphql" }));
app.listen(4000, () => console.log("Now browse to localhost:4000/graphiql"));
``;
