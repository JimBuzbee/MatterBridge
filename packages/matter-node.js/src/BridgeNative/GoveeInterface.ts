import { DeviceType, IotRecord, callUrl } from './IOTUtil'

let controlHost: string = "192.168.1.42"; // TODO 

//------------------------------------------------------------------------------------------------------------
export class GoveeInterface {
    private goveeDevices: any;
    private goveePrivate: any;
    private dcb: Function;

    constructor(filter: string, dcb: Function) {
        this.goveeDevices = new Object;
        this.goveePrivate = new Object; // ''
        this.dcb = dcb;
    }
    //------------------------------------------------------------------------------------------------------------
    private goveeFound = (loc: string): void => {

        let newRecord: IotRecord = {
            device: loc,
            binaryState: false,
            name: 'Bookcase', // TODO
            value: 0,
            deviceType: DeviceType.Govee,
        };

        this.goveeDevices[loc] = newRecord;
        this.goveePrivate[loc] = { client: null, cb: () => { } }
        this.dcb(this.goveeDevices[loc]);
    }
    //------------------------------------------------------------------------------------------------------------
    public start = () => this.goveeFound(`${controlHost}/cgi-bin/Govee.cgi`);
    //------------------------------------------------------------------------------------------------------------
    public registerForEvents = (device: string, cb: Function): void => {
        if (this.goveeDevices[device]) this.goveePrivate[device].cb = cb;
        else throw (device + ' is not a valid device.');

        return;
    }
    //------------------------------------------------------------------------------------------------------------
    public setState = (device: string, state: number): void => {

        if (this.goveeDevices[device]) {
            callUrl('http://' + device + '?' + ((state == 1) ? 'on=1' : 'off=1'), (data: any) => {

                // assume it worked 
                this.goveeDevices[device].binaryState = (state == 1) ? true : false;
            });
        } else throw (device + ' is not a valid device.');

        return;
    }
    //------------------------------------------------------------------------------------------------------------
    public getState = (device: string, cb: Function): void => {
        if (this.goveeDevices[device]) {
            cb(this.goveeDevices[device]);
        } else throw (device + ' is not a valid device.');
    }
    //------------------------------------------------------------------------------------------------------------
    public setBrightness = (device: string, state: number): void => { return; } // TODO
    //------------------------------------------------------------------------------------------------------------
    public getBrightness = (device: string): number => { return 0; } // TODO
    //------------------------------------------------------------------------------------------------------------
}