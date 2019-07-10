import React from "react";
import { Query, Mutation } from "react-apollo";
import gql from "graphql-tag";
import TempControl from "./TempControl";
import "./App.css";

const TEMP_SUBSCRIPTION = gql`
    subscription tempUpdated {
        updatedTemp {
            temperature {
                celsius
                fahrenheit
            }
            timestamp
            currentFanState
            currentFanControlState
            setPoint
        }
    }
`;

const TEMP_QUERY = gql`
    query initialState {
        temperature {
            fahrenheit
        }
        timestamp
        currentFanState
        currentFanControlState
        setPoint
    }
`;

const TEMP_TOGGLE_FANS_MUTATON = gql`
    mutation ToggleFans($fanState: String) {
        toggleFans(fanState: $fanState)
    }
`;

// const TEMP_SET_SET_POINT = gql`
//     mutation SetSetPoint($setPoint: Float) {
//         setSetPoint(setPoint: $setPoint)
//     }
// `;

const subscribeToUpdates = subscribeToMore => () => {
    subscribeToMore({
        document: TEMP_SUBSCRIPTION,
        updateQuery: (prev, { subscriptionData }) => {
            if (!subscriptionData.data) {
                return prev;
            }
            return subscriptionData.data.updatedTemp;
        }
    });
};

const updateFanControlState = (proxy, { data }) => {
    const newState = data && data.toggleFans;
    const cache = proxy.readQuery({ query: TEMP_QUERY });
    cache.currentFanControlState = newState;
    proxy.writeQuery({ query: TEMP_QUERY, data: cache });
};

const App = () => (
    <Query query={TEMP_QUERY}>
        {({ loading, error, data, subscribeToMore }) => {
            if (loading) return <p>Loading...</p>;
            if (error) return <p>Error :(</p>;
            if (!data) return <p>Nothing to see yet!</p>;
            const {
                timestamp,
                temperature = {},
                currentFanState,
                currentFanControlState
            } = data;
            return (
                <Mutation
                    mutation={TEMP_TOGGLE_FANS_MUTATON}
                    update={updateFanControlState}
                >
                    {toggleFans => (
                        <TempControl
                            onFanStateChange={toggleFans}
                            timestamp={timestamp}
                            temperature={temperature}
                            currentFanState={currentFanState}
                            currentFanControlState={currentFanControlState}
                            subscribeToUpdates={subscribeToUpdates(
                                subscribeToMore
                            )}
                        />
                    )}
                </Mutation>
            );
        }}
    </Query>
);

export default App;
