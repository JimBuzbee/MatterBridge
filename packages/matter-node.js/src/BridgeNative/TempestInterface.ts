import { IotRecord, DeviceType } from './IOTUtil'

//------------------------------------------------------------------------------------------------------------
export class TempestInterface {
    private static tempestDevices: any;
    private dcb: Function;
    private static tempestPrivate: any;
    private static tempestKey: string = 'dgram50222';

    constructor(filter: string, dcb: Function) {
        TempestInterface.tempestDevices = new Object;
        this.dcb = dcb;
        TempestInterface.tempestPrivate = new Object; // ''
    }
    //------------------------------------------------------------------------------------------------------------
    private tempestFound = (loc: string): void => {

        let newRecord: IotRecord = {
            device: loc + 'T',
            binaryState: false,
            name: 'Tempest T',
            value: 0,
            deviceType: DeviceType.Thermometer,
        };

        TempestInterface.tempestDevices[loc + 'T'] = structuredClone(newRecord); // clone so unique from newRecord mods in H device
        TempestInterface.tempestPrivate[loc + 'T'] = { cb: () => { } }
        this.dcb(TempestInterface.tempestDevices[loc + 'T']);

        newRecord.device = loc + 'H';
        newRecord.name = "Tempest H";
        newRecord.deviceType = DeviceType.Humidity;

        TempestInterface.tempestDevices[loc + 'H'] = newRecord;
        TempestInterface.tempestPrivate[loc + 'H'] = { cb: () => { } }
        this.dcb(TempestInterface.tempestDevices[loc + 'H']);
    }
    //------------------------------------------------------------------------------------------------------------
    public start = () => {

        this.tempestFound(TempestInterface.tempestKey);
        var udp = require('dgram');
        var server = udp.createSocket('udp4');
        server.bind(50222);

        // emits on datagram msg
        server.on('message', function(msg: Uint8Array, info: Uint8Array) {
            const data = JSON.parse(msg.toString());
            if (data.type == 'obs_st') {

                let value = data.obs[0][7]; //  * 1.8 + 32;
                let key = TempestInterface.tempestKey + 'T';
                TempestInterface.tempestDevices[key].value = value;
                TempestInterface.tempestPrivate[key].cb(TempestInterface.tempestDevices[key]);

                value = data.obs[0][8];
                key = TempestInterface.tempestKey + 'H';
                TempestInterface.tempestDevices[key].value = value;
                TempestInterface.tempestPrivate[key].cb(TempestInterface.tempestDevices[key]);
            }
        });
    }
    //------------------------------------------------------------------------------------------------------------
    public registerForEvents = (device: string, cb: Function): void => {
        if (TempestInterface.tempestDevices[device]) TempestInterface.tempestPrivate[device].cb = cb;
        else throw (device + ' is not a valid registerForEvents device.');
        return
    }
    //------------------------------------------------------------------------------------------------------------
    public setState = (device: string, state: number): void => { return; }
    //------------------------------------------------------------------------------------------------------------
    public getState = (device: string, cb: Function): IotRecord => {  // TODO - use cb to pass results
        if (TempestInterface.tempestDevices[device]) {
            return TempestInterface.tempestDevices[device];
        } else throw (device + ' is not a valid device.');
    }
    //------------------------------------------------------------------------------------------------------------
    public setBrightness = (device: string, state: number): void => { return; }
    //------------------------------------------------------------------------------------------------------------
    public getBrightness = (device: string): number => { return 0; }
    //------------------------------------------------------------------------------------------------------------
}
