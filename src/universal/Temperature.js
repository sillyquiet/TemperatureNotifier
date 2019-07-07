import React from "react";

const formatNumber = raw => raw.toFixed(1);

const valueStyle = {
    fontSize: "32px",
    fontWeight: "bold"
};

const titleStyle = {
    fontSize: "18px"
};

const containerStyle = {
    display: "flex",
    flexFlow: "column nowrap",
    alignItems: "center",
    padding: "0 5px"
};

const UNIT_ABBREVIATIONS = ["F", "C"];

const UNITS = {
    fahrenheit: 0,
    celsius: 1
};

const Temperature = ({
    timestamp = "",
    temperature: { celsius = 0, fahrenheit = 0 } = {},
    title = "",
    units = UNITS.fahrenheit
}) => {
    const temp = units === UNITS.fahrenheit ? fahrenheit : celsius;
    const abbrev = UNIT_ABBREVIATIONS[units];

    return (
        <div style={containerStyle}>
            <div style={titleStyle}>{title}</div>
            <span style={valueStyle}>{`${formatNumber(temp)} °${abbrev}`}</span>
        </div>
    );
};

export default Temperature;
