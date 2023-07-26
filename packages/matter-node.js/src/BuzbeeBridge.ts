#!/usr/bin/env node
/**
 * @license
 * Copyright 2022 The node-matter Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { singleton } from "@project-chip/matter.js/util";
import { Time } from "@project-chip/matter.js/time";
import { TimeNode } from "./time/TimeNode";

Time.get = singleton(() => new TimeNode());

import { Network } from "@project-chip/matter.js/net";
import { NetworkNode } from "./net/NetworkNode";

Network.get = singleton(() => new NetworkNode());

import { Crypto } from "@project-chip/matter.js/crypto";
import { CryptoNode } from "./crypto/CryptoNode";

Crypto.get = singleton(() => new CryptoNode());

import { CommissionableMatterNode, Matter } from "@project-chip/matter.js";
import { OnOffLightDevice, OnOffPluginUnitDevice, Aggregator, TemperatureDevice, HumidityDevice } from "@project-chip/matter.js/device";
import { DEVICE } from "@project-chip/matter.js/common";
import { VendorId } from "@project-chip/matter.js/datatype";
import { Logger } from "@project-chip/matter.js/log";
import { StorageManager } from "@project-chip/matter.js/storage";
import { StorageBackendDisk } from "./storage/StorageBackendDisk";
import { getIntParameter, getParameter } from "./util/CommandLine";
import packageJson from "../package.json";

import { IotRecord, DeviceType } from './BridgeNative/IOTUtil'
import { TemperatureMeasurementCluster, RelativeHumidityCluster, OnOffCluster } from "@project-chip/matter.js/cluster"; //"./cluster/index.js";

const logger = Logger.get("Device");

const storage = new StorageBackendDisk(getParameter("store") ?? "device-node");
const aggregator = new Aggregator();
let commissionableNode: any;
let matterServer: any;
let tClusters: any = new Object;

//---------------------------- JPB ---------------------------------------
import { IOTBridge } from "./BridgeNative/IOTBridge";

let iotBridge = new IOTBridge();  // class that knows how to handle native, non-matter devices

// get callback when new device is detected
iotBridge.registerCallbackNew((iotDevice: IotRecord) => {

    let measurementDevice;

    if (iotDevice.deviceType == DeviceType.OnOff || iotDevice.deviceType == DeviceType.Dimmer || iotDevice.deviceType == DeviceType.Govee) {
        measurementDevice = new OnOffLightDevice();
        tClusters[iotDevice.device] = measurementDevice.getClusterServer(OnOffCluster);
        aggregator.addBridgedDevice(measurementDevice, { nodeLabel: iotDevice.name.substring(0, 31), serialNumber: `node-matter-${iotDevice.device.substring(0, 5)}`, reachable: true });
        measurementDevice.addOnOffListener((on: boolean) => iotBridge.setState(iotDevice.device, on));
    } else if (iotDevice.deviceType == DeviceType.Thermometer) {
        measurementDevice = new TemperatureDevice();
        tClusters[iotDevice.device] = measurementDevice.getClusterServer(TemperatureMeasurementCluster);
        aggregator.addBridgedDevice(measurementDevice, { nodeLabel: iotDevice.name.substring(0, 31), serialNumber: `node-matter-${iotDevice.device.substring(0, 5)}`, reachable: true });
    } else if (iotDevice.deviceType == DeviceType.Humidity) {
        measurementDevice = new HumidityDevice();
        tClusters[iotDevice.device] = measurementDevice.getClusterServer(RelativeHumidityCluster);
        aggregator.addBridgedDevice(measurementDevice, { nodeLabel: iotDevice.name.substring(0, 31), serialNumber: `node-matter-${iotDevice.device.substring(0, 5)}`, reachable: true });
    }
});

// called upon change in device
iotBridge.registerCallbackUpdate((iotDevice: IotRecord) => {
    let currentValue: boolean;
    let newValue: boolean;

    switch (iotDevice.deviceType) {
        case DeviceType.Humidity:
            tClusters[iotDevice.device].attributes.measuredValue.set(iotDevice.value * 100)
            break;

        case DeviceType.Thermometer: // Celsius
            tClusters[iotDevice.device].attributes.measuredValue.set(iotDevice.value * 100)
            break;

        case DeviceType.OnOff:
            currentValue = tClusters[iotDevice.device].attributes.onOff.get();
            newValue = iotDevice.binaryState;
            if (currentValue != newValue) tClusters[iotDevice.device].attributes.onOff.set(newValue);
            break;

        case DeviceType.Govee:
            break;

        case DeviceType.Image:
            break;

        case DeviceType.Dimmer:
            currentValue = tClusters[iotDevice.device].attributes.onOff.get();
            newValue = iotDevice.binaryState;
            if (currentValue != newValue) tClusters[iotDevice.device].attributes.onOff.set(newValue);
            break;
    }
});

// wait three minutes before starting to give time for all new devices to be discovered
// TODO - this wait will no longer be needed when matter devices can be added to the bridge on the fly
setTimeout(() => {
    console.log('**************************** Starting ****************************');
    commissionableNode.addDevice(aggregator);
    matterServer.addCommissionableNode(commissionableNode);
    matterServer.start();
}, 3 * 60 * 1000);

//---------------------------- JPB ---------------------------------------


class BridgedDevice {
    async start() {
        logger.info(`node-matter@${packageJson.version}`);

        const storageManager = new StorageManager(storage);
        await storageManager.initialize();

        const deviceName = "Matter test device";
        const deviceType = DEVICE.AGGREGATOR.code;
        const vendorName = "matter-node.js";
        const passcode = getIntParameter("passcode") ?? 20202021;
        const discriminator = getIntParameter("discriminator") ?? 3840;
        // product name / id and vendor id should match what is in the device certificate
        const vendorId = new VendorId(getIntParameter("vendorid") ?? 0xFFF1);
        const productName = `node-matter OnOff-Bridge`;
        const productId = getIntParameter("productid") ?? 0x8001;

        const netAnnounceInterface = getParameter("announceinterface");
        const port = getIntParameter("port") ?? 5540;

        const numDevices = getIntParameter("num") || 2;

        matterServer = new Matter(storageManager, netAnnounceInterface);

        commissionableNode = new CommissionableMatterNode({
            port,
            deviceName,
            deviceType,
            passcode,
            discriminator,
            basicInformation: {
                vendorName,
                vendorId,
                productName,
                productId,
                serialNumber: `node-matter-${packageJson.version}`,
            }
        });

        logger.info("Listening");
        if (!commissionableNode.isCommissioned()) {
            const pairingData = commissionableNode.getPairingCode();
            const { qrCode, qrPairingCode, manualPairingCode } = pairingData;

            console.log(qrCode);
            console.log(`QR Code URL: https://project-chip.github.io/connectedhomeip/qrcode.html?data=${qrPairingCode}`);
            console.log(`Manual pairing code: ${manualPairingCode}`);
        } else {
            console.log("Device is already commissioned. Waiting for controllers to connect ...");
        }
    }
}

new BridgedDevice().start().then(() => { iotBridge.start();/* done */ }).catch(err => console.error(err));

process.on("SIGINT", () => {
    storage.close().then(() => process.exit(0)).catch(err => console.error(err));
});
