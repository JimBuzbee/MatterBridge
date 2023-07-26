export type IotRecord = {
    device: string,
    binaryState: boolean,
    name: string,
    value: number,
    deviceType: DeviceType,
    on?: () => void,
    off?: () => void,
    setBrightness?: (brightness: number) => void,
    getState?: (cb: Function) => void,
};

export enum DeviceType {
    Thermometer = 0,
    Humidity = 1,
    Image = 2,
    OnOff = 3,
    Dimmer = 4,
    Govee = 5,
}
//--------------------------------------------------------------------
const http = require("http");

export let callUrl = (url: string, cb: Function): void => {
    http.get(url, (resp: any) => {
        let data = "";

        // A chunk of data has been recieved.
        resp.on("data", (chunk: string) => { data += chunk; });

        // The whole response has been received. Send the result.
        resp.on("end", () => cb(data));
    }).on("error", (err: any) => {
        console.log("Error: " + err.message);
        cb(err.message);
    });
};
//--------------------------------------------------------------------
export async function readJsonFile(path: string) {
    const fs = require('fs');
    const file = fs.readFileSync(path, { encoding: 'utf8', flag: 'r' });
    return JSON.parse(file);
}
