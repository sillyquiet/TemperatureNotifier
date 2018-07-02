const Gpio = require("onoff");

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

const fansOn = () => {
    if (fansOK() && fans.readSync() === Gpio.HIGH) {
        const val = fans.writeSync(Gpio.LOW);
        console.log("Turning fan on");
    }
};

const fansOff = () => {
    if (fansOK() && fans.readSync() === Gpio.LOW) {
        const val = fans.writeSync(Gpio.HIGH);
        console.log("Turning fan off");
    }
};

const initFans = () => {
    if (Gpio && Gpio.accessible) {
        fans = new Gpio(27, "out");
        fans.writeSync(Gpio.HIGH);
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
    fansOK,
    initFans,
    fansOn
};
