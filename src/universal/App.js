import React from "react";
import { Subscription } from "react-apollo";
import gql from "graphql-tag";
import moment from "moment";
import "./App.css";
import Temperature from "./Temperature";

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
            fansAreOn
        }
    }
`;

const timestampStyle = {
    fontSize: "18px",
    fontWeight: "800",
    flex: "0 0 10%"
};

const containerStyle = {
    display: "flex",
    flexFlow: "row wrap",
    justifyContent: "space-evenly",
    alignItems: "center"
};

const tempContainerStyle = {
    display: "flex",
    flexFlow: "row nowrap",
    justifyContent: "space-between",
    flex: "0 0 auto"
};

const Fans = ({ fansAreOn }) => {
    return <span>{`Fan On: ${fansAreOn ? "Yes" : "No"}`}</span>;
};

const Timestamp = ({ timestamp }) => {
    return (
        <span style={timestampStyle}>
            {moment(timestamp).format("HH:mm:ss")}
        </span>
    );
};

const App = () => (
    <Subscription subscription={TEMP_SUBSCRIPTION}>
        {({ loading, error, data }) => {
            if (loading) return <p>Loading...</p>;
            if (error) return <p>Error :(</p>;
            if (!data || !data.updatedTemp) return <p>Nothing to see yet!</p>;
            const {
                timestamp,
                internalTemperature = {},
                externalTemperature = {},
                fansAreOn
            } = data.updatedTemp;
            return (
                <div style={containerStyle}>
                    <Timestamp timestamp={timestamp} />
                    <div style={tempContainerStyle}>
                        <Temperature
                            title={"Internal Temperature"}
                            timestamp={timestamp}
                            temperature={internalTemperature}
                        />
                        <Temperature
                            title={"External Temperature"}
                            timestamp={timestamp}
                            temperature={externalTemperature}
                        />
                    </div>
                    <Fans fansAreOn={fansAreOn} />
                </div>
            );
        }}
    </Subscription>
);

export default App;
