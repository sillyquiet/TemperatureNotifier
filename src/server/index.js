const express = require("express");
const bodyParser = require("body-parser");
const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const { makeExecutableSchema } = require("graphql-tools");
const deviceFile = "/sys/bus/w1/devices/0117b2112cff/w1_slave";

const typeDefs = [
  `
type Query {
  hello: String
}

schema {
  query: Query
}`
];

const lineReader = require("readline").createInterface({
  input: require("fs").createReadStream(deviceFile)
});

const resolvers = {
  Query: {
    hello(root) {
      lineReader.on("line", function(line) {
        console.log("Line from file:", line);
      });
    }
  }
};

const schema = makeExecutableSchema({ typeDefs, resolvers });
const app = express();
app.use("/graphql", bodyParser.json(), graphqlExpress({ schema }));
app.use("/graphiql", graphiqlExpress({ endpointURL: "/graphql" }));
app.listen(4000, () => console.log("Now browse to localhost:4000/graphiql"));
``;
