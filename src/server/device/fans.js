let Gpio;
try {
    Gpio = require("onoff").Gpio;
} catch (err) {}

let fans;

class GpioMock {
    constructor(port, direction) {
        this.value = 0;
        return this;
    }
    writeSync(value) {
        this.value = value;
        console.log("virtual fan now uses value: " + value);
    }
    readSync() {
        return this.value;
    }
    unexport() {}
}
GpioMock.accessible = true;
GpioMock.HIGH = 1;
GpioMock.LOW = 0;

const fansOK = () => {
    return fans && Gpio.accessible;
};

let fanToggle = false;

const fansAreOn = () => {
    return fanToggle;
};

const fansOn = () => {
    if (fansOK() && fans.readSync() === Gpio.HIGH) {
        const val = fans.writeSync(Gpio.LOW);
        fanToggle = true;
        console.log("Turning fan on");
    }
};

const fansOff = () => {
    if (fansOK() && fans.readSync() === Gpio.LOW) {
        const val = fans.writeSync(Gpio.HIGH);
        fanToggle = false;
        console.log("Turning fan off");
    }
};

const initFans = () => {
    if (Gpio && Gpio.accessible) {
        fans = new Gpio(27, "out");
        fans.writeSync(Gpio.HIGH);
        fanToggle = false;
        process.on("SIGINT", () => {
            console.log("Received sigint, disconnecting");
            fans.unexport();
            process.exit(0);
        });
    } else {
        console.log("Cannot load onoff on this device, using mock");
        Gpio = GpioMock;
        fans = new GpioMock(27, "out");
    }

    return fans;
};

module.exports = {
    fansOff,
    fansAreOn,
    fansOK,
    initFans,
    fansOn
};
