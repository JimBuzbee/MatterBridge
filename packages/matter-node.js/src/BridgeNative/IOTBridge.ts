
import { WemoInterface } from './WemoInterface'
import { ShellyInterface } from './ShellyInterface'
import { PiInterface } from './PiThermometerInterface';
import { TempestInterface } from './TempestInterface';
import { GoveeInterface } from './GoveeInterface';
import { IotRecord } from './IOTUtil'

let iotDevices: any = new Object; // IotDevice
let wemoInterface: WemoInterface; // TODO - make these real interfaces?
let piInterface: PiInterface;
let shellyInterface: ShellyInterface;
let tempestInterface: TempestInterface;
let goveeInterface: GoveeInterface;

let callbackNew: Function; // TODO - list?
let callbackUpdate: Function; // TODO - list?

export class IOTBridge {
    //-----------------------------------------------------------------------------------------
    constructor() { // TODO - can I make this and "start" dynamic?
        wemoInterface = new WemoInterface('BELKIN', (iotDevice: IotRecord) => this.populateDevice(iotDevice, wemoInterface));
        piInterface = new PiInterface('TemperatureProbe', (iotDevice: IotRecord) => this.populateDevice(iotDevice, piInterface));
        shellyInterface = new ShellyInterface('shelly', (iotDevice: IotRecord) => this.populateDevice(iotDevice, shellyInterface));
        tempestInterface = new TempestInterface('tempest', (iotDevice: IotRecord) => this.populateDevice(iotDevice, tempestInterface));
        goveeInterface = new GoveeInterface('govee', (iotDevice: IotRecord) => this.populateDevice(iotDevice, goveeInterface));
    }
    //-----------------------------------------------------------------------------------------
    public start() {
        wemoInterface.start();
        shellyInterface.start();
        piInterface.start();
        tempestInterface.start();
        goveeInterface.start();
    }
    //-----------------------------------------------------------------------------------------
    // Device has been found - add to local collection
    private populateDevice(iotDevice: IotRecord, bridge: WemoInterface | PiInterface | ShellyInterface | TempestInterface | GoveeInterface): void {
        console.log('New device: ' + iotDevice.name + ' ' + iotDevice.device);

        let newDevice: IotRecord = {
            device: iotDevice.device,
            name: iotDevice.name,
            binaryState: iotDevice.binaryState,
            value: iotDevice.value,
            deviceType: iotDevice.deviceType,
            on: () => bridge.setState(iotDevice.device, 1), // native methods - TODO, all not applicable
            off: () => bridge.setState(iotDevice.device, 0),
            setBrightness: (brightness: number) => bridge.setBrightness(iotDevice.device, brightness),
            getState: (cb: Function) => bridge.getState(iotDevice.device, cb)
        };

        iotDevices[iotDevice.device] = newDevice;

        // get a callback when device status changees
        bridge.registerForEvents(iotDevice.device, (result: IotRecord) => this.updateRecord(iotDevices[result.device], result));

        // make sure list is current with state of device - TODO needed? indirectly causes updateWsClient call
        iotDevices[iotDevice.device].getState((result: any) => this.updateRecord(iotDevices[result.device], result));

        if (callbackNew != null) callbackNew(iotDevices[iotDevice.device]);
    }
    //-----------------------------------------------------------------------------------------
    // Update local list with data from client
    private updateRecord(localDevice: IotRecord, result: IotRecord): void {
        localDevice.binaryState = result.binaryState;
        localDevice.value = result.value;
        localDevice.name = result.name;
        localDevice.deviceType = result.deviceType;

        if (callbackUpdate != null) callbackUpdate(iotDevices[localDevice.device]);
    }
    //-----------------------------------------------------------------------------------------
    public setState(device: string, state: boolean) {
        if (state) iotDevices[device].on(); else iotDevices[device].off();
    }
    //-----------------------------------------------------------------------------------------
    public registerCallbackNew(cb: Function) { callbackNew = cb; }
    //-----------------------------------------------------------------------------------------
    public registerCallbackUpdate(cb: Function) { callbackUpdate = cb; }
    //-----------------------------------------------------------------------------------------
}
