import React from "react";
import { Query } from "react-apollo";
import gql from "graphql-tag";
import moment from "moment";

import "./App.css";

const formatNumber = raw => raw.toFixed(1);

const App = () => (
    <Query
        query={gql`
            {
                temperature {
                    celsius
                    fahrenheit
                }
                timestamp
            }
        `}
        pollInterval={2000}
    >
        {({ loading, error, data }) => {
            if (loading) return <p>Loading...</p>;
            if (error) return <p>Error :(</p>;

            return (
                <div>
                    <p>Temperature</p>
                    <span>{`${moment(data.timestamp).format(
                        "H:mm:ss"
                    )}  --  ${formatNumber(
                        data.temperature.celsius
                    )} °C  --  ${formatNumber(
                        data.temperature.fahrenheit
                    )} °F`}</span>
                </div>
            );
        }}
    </Query>
);

export default App;
