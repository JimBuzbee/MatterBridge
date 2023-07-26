const mdns = require('mdns');
import { IotRecord, callUrl, DeviceType, readJsonFile } from './IOTUtil'

//------------------------------------------------------------------------------------------------------------
export class ShellyInterface {
    private searchTime: number = 5;
    private waitTime: number = 120;
    private shellyDevices: any;
    private shellyPrivate: any;
    private dcb: Function;
    private browser: any;
    private nameType: string = "";
    private metadata: any;

    private lookCount: number;
    private lookSeconds: number;
    public allowOthers: boolean;

    constructor(id: string, dcb: Function) {
        this.shellyDevices = new Object; // IotRecord : couuld be Map, but usage turns out to be a PITA
        this.shellyPrivate = new Object; // ''
        this.lookCount = 0;
        this.lookSeconds = this.searchTime; // initiall time to look for shellys, later change to long time in between
        this.dcb = dcb;
        this.allowOthers = false;
        this.nameType = id;
        this.metadata = {};

        readJsonFile("./ShellyBridgeMetadata.json").then((data) => this.metadata = data);
    }
    //------------------------------------------------------------------------------------------------------------
    private shellyFound = (deviceInfo: any, state: string): void => {

        if (deviceInfo == null) {
            console.log("Shelly Error");
            return;
        }
        var subType = deviceInfo.host;

        if (!deviceInfo.name.includes(this.nameType)) return;

        var txtRecord: string = JSON.stringify(deviceInfo.txtRecord);

        if (!txtRecord) { console.log('failed to parse txt record for ' + deviceInfo.name); return; };

        if (txtRecord && txtRecord.includes('switch25')) {
            subType = deviceInfo.host + '/relay/';

            for (let i = 0; i < 2; i++) {
                if (this.shellyDevices[subType + i]) continue;
                let name: string = deviceInfo.name;

                if (this.metadata[subType + i] && this.metadata[subType + i].name) name = this.metadata[subType + i].name;

                let newRecord: IotRecord = {
                    device: subType + i,
                    binaryState: false,
                    value: 0,
                    name: name,
                    deviceType: DeviceType.OnOff,
                };

                this.shellyDevices[subType + i] = structuredClone(newRecord);

                callUrl('http://' + subType + i + '?status', (data: any) => { this.shellyDevices[subType + i].binaryState = data.ison; });
                this.shellyPrivate[subType + i] = { client: null, cb: () => { } }

                this.dcb(this.shellyDevices[subType + i]);
            }
        } else if (txtRecord.includes('dimmer-l51')) {
            subType = deviceInfo.host + '/light/0';

            if (this.shellyDevices[subType]) return;
            if (this.metadata[subType] && this.metadata[subType].name) deviceInfo.name = this.metadata[subType].name;

            let newRecord: IotRecord = {
                device: subType,
                binaryState: false,
                value: 0,
                name: deviceInfo.name,
                deviceType: DeviceType.Dimmer,
            };
            this.shellyDevices[subType] = structuredClone(newRecord);

            callUrl('http://' + subType + '?status', (data: any) => { this.shellyDevices[subType].binaryState = data.binaryState; });
            this.shellyPrivate[subType] = { client: null, cb: () => { } }
            this.dcb(this.shellyDevices[subType]);
        }

        return;

        /* example
        {"ison":false,"has_timer":false,"timer_started":0,"timer_duration":0,"timer_remaining":0,"overpower":false,"overtemperature":false,"is_valid":true,"source":"http"}
        {"ison":false,"source":"http","has_timer":false,"timer_started":0,"timer_duration":0,"timer_remaining":0,"mode":"white","brightness":66,"transition":0}
        {"ison":false,"source":"http","has_timer":false,"timer_started":0,"timer_duration":0,"timer_remaining":0,"mode":"white","brightness":66,"transition":0}
        {"ison":false,"has_timer":false,"timer_started":0,"timer_duration":0,"timer_remaining":0,"overpower":false,"overtemperature":false,"is_valid":true,"source":"http"}
        */
    }
    //------------------------------------------------------------------------------------------------------------
    private toggleSearchForShellys = (): void => {
        if (++this.lookCount == 1) {
            this.browser.stop();
            this.lookSeconds = this.waitTime;
            setTimeout(() => this.toggleSearchForShellys(), this.lookSeconds * 1000); // come back later to restart
        } else { // time to look again
            this.lookCount = 0;
            this.lookSeconds = this.searchTime;
            this.searchMdns();
        }
    }
    //------------------------------------------------------------------------------------------------------------
    public start = () => { this.searchMdns(); this.pollShellys() };
    //------------------------------------------------------------------------------------------------------------
    public pollShellys = (): void => {
        for (const i in this.shellyDevices) {
            let host = this.shellyDevices[i].device;
            callUrl('http://' + host + '?status', (data: string) => {
                try {
                    var status = JSON.parse(data);
                    this.shellyDevices[host].binaryState = (status.ison) ? true : false;
                    if (this.shellyDevices[host].deviceType == DeviceType.Dimmer) this.shellyDevices[host].value = +status.brightness;
                    this.shellyPrivate[host].cb(this.shellyDevices[host]);
                } catch (err) { console.log("pollShellys failed to parse '" + data + "': host " + host + ": " + err) }
            });
        }
        setTimeout(() => this.pollShellys(), 30 * 1000);
    }
    //------------------------------------------------------------------------------------------------------------
    public searchMdns = (): void => {
        this.browser = mdns.createBrowser(mdns.tcp('http'));
        this.browser.on('serviceDown', (service: any): void => { this.shellyFound(service, 'down'); });
        this.browser.on('serviceUp', (service: any) => { this.shellyFound(service, 'up'); });
        this.browser.start();

        setTimeout(() => this.toggleSearchForShellys(), this.lookSeconds * 1000);
    }
    //------------------------------------------------------------------------------------------------------------
    public registerForEvents = (device: string, cb: Function): void => {
        if (this.shellyDevices[device]) this.shellyPrivate[device].cb = cb;
        else throw (device + ' is not a valid shelly registerForEvents device.');
        return
    }
    //------------------------------------------------------------------------------------------------------------
    public setState = (device: string, state: number) => {
        if (this.shellyDevices[device]) {
            callUrl('http://' + device + '?turn=' + (state == 1 ? 'on' : 'off'), (data: string) => {
                try {
                    var status = JSON.parse(data);
                    this.shellyDevices[device].binaryState = (status.ison) ? true : false;
                } catch (err) { console.log(err) }
            });
        } else throw (device + ' is not a valid device.');
    }
    //------------------------------------------------------------------------------------------------------------
    public getState = (device: string, cb: Function) => {
        if (this.shellyDevices[device]) {
            callUrl('http://' + device + '?status', (data: string) => {
                try {
                    var status = JSON.parse(data);
                    this.shellyDevices[device].binaryState = (status.ison) ? true : false;
                    if (this.shellyDevices[device].deviceType == DeviceType.Dimmer) this.shellyDevices[device].value = +status.brightness;
                } catch (err) { console.log(err) }
                cb(this.shellyDevices[device]);
            });
        } else throw (device + ' is not a valid device.');
    }
    //------------------------------------------------------------------------------------------------------------
    public setBrightness = (device: string, state: number) => {
        if (this.shellyPrivate[device] && this.shellyDevices[device].deviceType == DeviceType.Dimmer) {
            callUrl('http://' + device + '?brightness=' + state, (data: string) => {
                try {
                    var status = JSON.parse(data);
                    this.shellyDevices[device].binaryState = (status.ison) ? true : false;
                    this.shellyDevices[device].value = status.brightness;
                    //   console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@  = ' + JSON.stringify(this.shellyDevices[ device ])) ;
                } catch (err) { console.log(err) }
            });
        } else throw (device + ' is not a valid dimmer device.');
    }
    //------------------------------------------------------------------------------------------------------------
    public getBrightness = (device: string, cb: Function) => {
        if (this.shellyPrivate[device] && this.shellyDevices[device].deviceType == DeviceType.Dimmer) {
            this.getState(device, cb);
        } else throw (device + ' is not a valid dimmer device.');
    }
    //------------------------------------------------------------------------------------------------------------
}
