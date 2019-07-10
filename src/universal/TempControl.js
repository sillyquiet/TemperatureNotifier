import React, { Component } from "react";
import moment from "moment";
import Temperature from "./Temperature";
import { FAN_STATE_ON, FAN_STATE_AUTO, FAN_STATE_OFF } from "./constants";

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

const timestampStyle = {
    fontSize: "18px",
    fontWeight: "800",
    flex: "0 0 10%"
};

const inputGroupStyle = {
    display: "flex",
    flexFlow: "row nowrap",
    justifyContent: "space-evenly"
};

const inputStyle = {
    display: "flex",
    flexFlow: "column nowrap",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 10px"
};

const Timestamp = ({ timestamp }) => {
    return (
        <span style={timestampStyle}>
            {moment(timestamp).format("HH:mm:ss")}
        </span>
    );
};

const Fans = ({ fansAreOn }) => {
    return <span>{`Fan On: ${fansAreOn ? "Yes" : "No"}`}</span>;
};

export default class TempControl extends Component {
    componentDidMount() {
        this.props.subscribeToUpdates();
        this.handleInputClick = this.handleInputClick.bind(this);
    }

    handleInputClick(event) {
        const { onFanStateChange } = this.props;
        const newFanState =
            (event && event.currentTarget && event.currentTarget.value) ||
            FAN_STATE_OFF;
        onFanStateChange({
            variables: { fanState: newFanState },
            optimisticResponse: { toggleFans: newFanState }
        });
    }

    render() {
        const {
            timestamp,
            temperature,
            currentFanState,
            currentFanControlState
        } = this.props;
        return (
            <div style={containerStyle}>
                <Timestamp timestamp={timestamp} />
                <div style={tempContainerStyle}>
                    <Temperature
                        title={"Temperature"}
                        timestamp={timestamp}
                        temperature={temperature}
                    />
                </div>
                <Fans fansAreOn={currentFanState === FAN_STATE_ON} />
                <div style={inputGroupStyle}>
                    <div style={inputStyle}>
                        {"Auto"}
                        <input
                            onChange={this.handleInputClick}
                            type="radio"
                            name="fanState"
                            value={FAN_STATE_AUTO}
                            checked={currentFanControlState === FAN_STATE_AUTO}
                        />
                    </div>
                    <div style={inputStyle}>
                        {"On"}
                        <input
                            onChange={this.handleInputClick}
                            type="radio"
                            name="fanState"
                            value={FAN_STATE_ON}
                            checked={currentFanControlState === FAN_STATE_ON}
                        />
                    </div>
                    <div style={inputStyle}>
                        {"Off"}
                        <input
                            onChange={this.handleInputClick}
                            type="radio"
                            name="fanState"
                            value={FAN_STATE_OFF}
                            checked={currentFanControlState === FAN_STATE_OFF}
                        />
                    </div>
                </div>
            </div>
        );
    }
}
