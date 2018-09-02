import React from "react";
import { Subscription } from "react-apollo";
import gql from "graphql-tag";
import moment from "moment";

import "./App.css";

const formatNumber = raw => raw.toFixed(1);
const TEMP_SUBSCRIPTION = gql`
    subscription tempUpdated {
        updatedTemp {
            externalTemperature {
                celsius
                fahrenheit
            }
            internalTemperature {
                celsius
                fahrenheit
            }
            timestamp
        }
    }
`;

const App = () => (
    <Subscription subscription={TEMP_SUBSCRIPTION}>
        {({ loading, error, data }) => {
            if (loading) return <p>Loading...</p>;
            if (error) return <p>Error :(</p>;
            if (!data || !data.updatedTemp) return <p>Nothing to see yet!</p>;
            const {
                timestamp,
                internalTemperature: {
                    celsius: internalCelsius,
                    fahrenheit: internalFahrenheit
                } = {},
                externalTemperature: {
                    celsius: externalCelsius,
                    fahrenheit: externalFahrenheit
                } = {}
            } = data.updatedTemp;
            return (
                <div>
                    <p>Temperature</p>
                    <span>{`${moment(timestamp).format(
                        "H:mm:ss"
                    )}  --  ${formatNumber(
                        internalCelsius
                    )} °C  --  ${formatNumber(internalFahrenheit)} °F`}</span>
                </div>
            );
        }}
    </Subscription>
);

export default App;
