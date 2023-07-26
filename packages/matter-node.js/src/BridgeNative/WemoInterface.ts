import Wemo = require("wemo-client");
import { DeviceType, IotRecord } from './IOTUtil'

//------------------------------------------------------------------------------------------------------------
export class WemoInterface {
    private wemoDevices: any;
    private wemoPrivate: any;
    private wemo: Wemo;
    private dcb: Function;
    private filter: string

    private lookCount: number;
    private lookSeconds: number;
    private searchTime: number = 10;
    private waitTime: number = 30;

    public allowOthers: boolean;

    constructor(filter: string, dcb: Function) {
        this.wemoDevices = new Object; // IotRecord : couuld be Map, but usage turns out to be a PITA
        this.wemoPrivate = new Object; // ''
        this.wemo = new Wemo();
        this.lookCount = 0;
        this.lookSeconds = this.searchTime; // initially short look for wemos, then later change to longer time
        this.dcb = dcb;
        this.allowOthers = false;
        this.filter = filter;
    }
    //------------------------------------------------------------------------------------------------------------
    private wemoFound = (err: Error, deviceInfo: Wemo.IDevice): void => {
        if (deviceInfo == null) {
            console.log("Error = %s", err);
            return;
        }

        let newRecord: IotRecord = {
            device: deviceInfo.host,
            binaryState: false,
            name: deviceInfo.friendlyName,
            value: 0,
            deviceType: deviceInfo.deviceType && deviceInfo.deviceType.includes('immer') ? DeviceType.Dimmer : DeviceType.OnOff,
        }
        this.wemoDevices[deviceInfo.host] = newRecord;

        this.wemoPrivate[deviceInfo.host] = {
            client: this.wemo.client(deviceInfo),
            cb: () => { }
        }

        const client: Wemo.IClient = this.wemoPrivate[deviceInfo.host].client;

        // Node will throw exception if errors are left unhandled
        this.wemoPrivate[deviceInfo.host].client.on('error', (err: { code: string }) => { console.log('Wemo Error: %s', err.code) })

        // TODO - Some events appear not to be detected - add long poll to make sure we are in sync
        // Handle events
        this.wemoPrivate[deviceInfo.host].client.on('binaryState', (value: string) => {
            this.wemoDevices[client.device.host].binaryState = (+value != 0) ? true : false;
            this.wemoPrivate[client.device.host].cb(this.wemoDevices[client.device.host]);
        });

        this.wemoPrivate[deviceInfo.host].client.on('statusChange', (value: string) => {
            this.wemoDevices[client.device.host].binaryState = (+value != 0) ? true : false;
            this.wemoPrivate[client.device.host].cb(this.wemoDevices[client.device.host]);
        });

        this.wemoPrivate[deviceInfo.host].client.on('brightness', (value: string) => {
            this.wemoDevices[client.device.host].value = +value;
            this.wemoPrivate[client.device.host].cb(this.wemoDevices[client.device.host]);
        });

        // discovery callback - by default only include Belkin to weed out invalid HA simulator
        if (this.allowOthers || deviceInfo.manufacturer.toUpperCase().includes(this.filter))
            this.dcb(this.wemoDevices[client.device.host]);
        else this.wemoPrivate[deviceInfo.host].cb = () => { };
    }
    //------------------------------------------------------------------------------------------------------------
    private lookForWemos = (): void => {
        if (++this.lookCount > 3) this.lookSeconds = this.waitTime;
        setTimeout(() => this.lookForWemos(), this.lookSeconds * 1000);

        // call wemoFound each time a new wemo is discovered
        this.wemo.discover(this.wemoFound);
    }
    //------------------------------------------------------------------------------------------------------------
    public start = () => this.lookForWemos();
    //------------------------------------------------------------------------------------------------------------
    public registerForEvents = (device: string, cb: Function): void => {
        if (this.wemoDevices[device]) this.wemoPrivate[device].cb = cb;
        else throw (device + ' is not a valid device.');
        return
    }
    //------------------------------------------------------------------------------------------------------------
    public setState = (device: string, state: number): void => {
        if (this.wemoDevices[device] && this.wemoPrivate[device].client) {
            this.wemoPrivate[device].client.setBinaryState(state);
        } else throw (device + ' is not a valid device.');
    }
    //------------------------------------------------------------------------------------------------------------
    public getState = (device: string, cb: Function): IotRecord => {  // TODO - use cb to pass results
        if (this.wemoDevices[device] && this.wemoPrivate[device].client) {
            return this.wemoDevices[device];
        } else throw (device + ' is not a valid device.');
    }
    //------------------------------------------------------------------------------------------------------------
    public setBrightness = (device: string, state: number): void => {
        if (this.wemoPrivate[device] && this.wemoPrivate[device].client && this.wemoDevices[device].deviceType == DeviceType.Dimmer) {
            this.wemoPrivate[device].client.setBrightness(state);
        } else throw (device + ' is not a valid dimmer device.');
    }
    //------------------------------------------------------------------------------------------------------------
    public getBrightness = (device: string): number => {
        if (this.wemoPrivate[device] && this.wemoPrivate[device].client && this.wemoDevices[device].deviceType == DeviceType.Dimmer) {
            return this.wemoPrivate[device].client.getBrightness();
        } else throw (device + ' is not a valid dimmer device.');
    }
    //------------------------------------------------------------------------------------------------------------
}
