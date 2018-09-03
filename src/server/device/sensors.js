const fs = require("fs");

const sensors = { external: "28-00000a29795e", internal: "28-0117b2112cff" }; // make this configurable
let sensorPaths = {};

const getSensorPath = deviceName => {
    const try_sensor_path = `/sys/bus/w1/devices/${deviceName}/w1_slave`;
    const mock_sensor_path = "src/server/sensorMock";

    try {
        fs.accessSync(try_sensor_path, fs.constants.F_OK | fs.constants.R_OK);
        return try_sensor_path;
    } catch (err) {
        console.log("Cannot access sensor file, using mock");
        return mock_sensor_path;
    }
};

const getExternalReading = async () => {
    try {
        return readSensorHW(sensors.external);
    } catch (err) {
        console.log(err.message);
        return {};
    }
};

const getInternalReading = async () => {
    try {
        return readSensorHW(sensors.internal);
    } catch (err) {
        console.log(err.message);
        return {};
    }
};

const initSensors = () => {
    sensorPaths = {};
    sensorPaths[sensors.external] = getSensorPath(sensors.external);
    sensorPaths[sensors.internal] = getSensorPath(sensors.internal);
};

const readSensorHW = deviceName => {
    const sensor_path = sensorPaths[deviceName] || "";

    return new Promise((resolve, reject) => {
        try {
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

module.exports = {
    getInternalReading,
    getExternalReading,
    initSensors
};
