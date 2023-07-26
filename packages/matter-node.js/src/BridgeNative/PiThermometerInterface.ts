const mdns = require('mdns');
import { IotRecord, DeviceType, callUrl, readJsonFile } from './IOTUtil'

//------------------------------------------------------------------------------------------------------------
export class PiInterface {
    private searchTime: number = 10;
    private waitTime: number = 130;
    private piDevices: any;
    private piPrivate: any;
    private discoveryCallback: Function;
    private browser: any;
    private nameFilter: string = "";
    private metadata: any;

    private lookCount: number;
    private lookSeconds: number;

    constructor(id: string, discoveryCallback: Function) {
        this.piDevices = new Object; // PiRecord : couuld be Map, but usage turns out to be a PITA
        this.piPrivate = new Object; // ''
        this.lookCount = 0;
        this.lookSeconds = this.searchTime; // initiall time to look for Pis, later change to long time in between
        this.discoveryCallback = discoveryCallback;
        this.nameFilter = id;
        this.metadata = {};

        readJsonFile("./PiBridgeMetadata.json").then((data) => this.metadata = data);
    }
    //------------------------------------------------------------------------------------------------------------
    private piExternaltoInternalKey = (key: string): string => {
        let index = key.indexOf('/');
        if (index < 0) throw (key + ' does not have/ delimiter ');
        return key.substring(0, key.indexOf('/'));
    }
    //------------------------------------------------------------------------------------------------------------
    private piFound = (deviceInfo: any, state: string): void => {

        if (deviceInfo == null || !(deviceInfo.name.includes(this.nameFilter))) return;

        let found: boolean = false;
        let inside = false;

        // see if we can find an IP address instead of a mdns name
        for (let j in deviceInfo.addresses) {
            // if not a ipv6 address, use it
            if (!deviceInfo.addresses[j].includes('::')) {
                deviceInfo.host = deviceInfo.addresses[j];
                found = true;
                break;
            }
        }

        // if we didn't find an ipv4 address give up (inconsistant results resolving mdns names)
        if (!found) return;

        let key = deviceInfo.host;

        if (this.metadata[key] && this.metadata[key].inside) inside = true; else inside = false;
        inside = this.metadata[key] && this.metadata[key].inside;

        // if we already have this one, return;
        if (this.piDevices[key]) return;

        let initialRecord: IotRecord = {
            device: key,
            binaryState: false,
            name: deviceInfo.name,
            value: 0,
            deviceType: DeviceType.Thermometer
        };

        this.piDevices[key] = initialRecord;
        this.getPiState(key, this.discoveryCallback);

        this.piPrivate[key] = { eventCb: () => { }, inside: inside };

        return;
    }
    //------------------------------------------------------------------------------------------------------------
    public registerForEvents = (device: string, cb: Function): void => {
        let internalKey = this.piExternaltoInternalKey(device);
        if (this.piDevices[internalKey]) this.piPrivate[internalKey].eventCb = cb;
        else throw (internalKey + ' is not a valid registerForEvents device.');
        return
    }
    //------------------------------------------------------------------------------------------------------------
    private toggleSearchForPis = (): void => {
        if (++this.lookCount == 1) {
            this.browser.stop();
            this.lookSeconds = this.waitTime;
            setTimeout(() => this.toggleSearchForPis(), this.lookSeconds * 1000); // come back later to restart
        } else { // time to look again
            this.lookCount = 0;
            this.lookSeconds = this.searchTime;
            this.searchMdns()
        }
    }
    //------------------------------------------------------------------------------------------------------------
    public start = () => { this.searchMdns(); this.pollThermometer() }; // TODO - support list of thermometers in json along with mdns
    //------------------------------------------------------------------------------------------------------------
    public pollThermometer = (): void => {
        for (const k in this.piDevices) {
            let host = this.piDevices[k].device;
            this.getPiState(host, this.piPrivate[host].eventCb);
        }
        setTimeout(() => this.pollThermometer(), 60 * 1000);
    }
    //------------------------------------------------------------------------------------------------------------
    private getPiState(host: string, cb: Function): void {
        callUrl(`http://${host}/cgi-bin/state.cgi`, (data: string) => {

            if (data === null) return;

            // Garage,0.9.7.03,8,42M, 53.2616, 1 wk 4 days 16 hrs 15 min, #ff2600
            let lineArr = data.split('\n');

            for (let j in lineArr) {

                if (lineArr[j].length == 0) continue;
                let valueArr = lineArr[j].split(',');
                if (valueArr.length == 1) continue;

                // create a new record that can be passed back to client
                let recordForClient: IotRecord = structuredClone(this.piDevices[host]);

                recordForClient.device = host + '/' + j;
                recordForClient.name = valueArr[0];

                // hack...
                if (recordForClient.name.toUpperCase().includes('HUMIDITY')) {
                    recordForClient.value = +valueArr[4];
                    recordForClient.deviceType = DeviceType.Humidity;
                } else {
                    recordForClient.value = (+valueArr[4] - 32) * 5.0 / 9.0;
                    recordForClient.deviceType = DeviceType.Thermometer;
                }
                try { cb(recordForClient); } catch (err) { console.log(' cb error for ' + host + ' ' + err); }
            }
        });
    }
    //------------------------------------------------------------------------------------------------------------
    public searchMdns = (): void => {
        this.browser = mdns.createBrowser(mdns.tcp('http'));
        this.browser.on('serviceDown', (service: any): void => { this.piFound(service, 'down'); });
        this.browser.on('serviceUp', (service: any) => { this.piFound(service, 'up'); });
        this.browser.start();

        setTimeout(() => this.toggleSearchForPis(), this.lookSeconds * 1000);
    }
    //------------------------------------------------------------------------------------------------------------
    public setState = (device: string, v: number) => { throw (device + ' is a read-only device.'); }
    //------------------------------------------------------------------------------------------------------------
    public getState = (device: string, clientCb: Function) => {
        let internalKey = this.piExternaltoInternalKey(device);
        if (this.piDevices[internalKey]) this.getPiState(internalKey, clientCb);
        else throw (device + ' is not a valid device for getState.');
    }
    //------------------------------------------------------------------------------------------------------------
    public setBrightness = (device: string, d: number) => { throw (device + ' is a read only device.'); }
    //------------------------------------------------------------------------------------------------------------
    public getBrightness = (device: string, d: Function) => { throw (device + ' is not a valid dimmer device.'); }
    //------------------------------------------------------------------------------------------------------------
}
