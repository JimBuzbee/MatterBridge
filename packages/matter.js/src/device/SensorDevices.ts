/**
 * @license
 * Copyright 2022 The matter.js Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { DEVICE, DeviceTypeDefinition } from "../common/DeviceTypes.js";

import { Device } from "./Device.js";
import { Logger } from "../log/Logger.js";
import { createDefaultIdentifyClusterServer } from "../cluster/server/IdentifyServer.js";
import { createDefaultGroupsClusterServer } from "../cluster/server/GroupsServer.js";
import { createDefaultScenesClusterServer } from "../cluster/server/ScenesServer.js";
import { createDefaultTemperatureMeasurementClusterServer, createDefaultWaterContentMeasurementClusterServer } from "../cluster/server/SensorMeasurementServer.js";
import { TemperatureMeasurementCluster } from "../cluster/index.js";
import { ClusterServer } from "../protocol/interaction/InteractionServer.js";

const logger = Logger.get("SensorDevice");

abstract class SensorBaseDevice extends Device {
    constructor(definition: DeviceTypeDefinition, clusterServer: any, endpointId?: number) {
        super(definition, [], endpointId);
        this.addMandatoryDeviceClusters(clusterServer);
    }

    protected addMandatoryDeviceClusters(clusterServer: any) {
        this.addClusterServer(createDefaultIdentifyClusterServer({
            identify: async ({ request: { identifyTime } }) => console.log(identifyTime) // this.onIdentify(identifyTime)
        }));

        this.addClusterServer(createDefaultGroupsClusterServer());
        this.addClusterServer(createDefaultScenesClusterServer());
        this.addClusterServer(clusterServer);
    }

    // Add Listeners convenient for chosen attributes
    addValueListener(listener: (newValue: number | null) => void) {
        this.getClusterServer(TemperatureMeasurementCluster)?.attributes.measuredValue.addListener(listener);
    }
}

export class TemperatureDevice extends SensorBaseDevice {
    constructor(endpointId?: number) {
        super(DEVICE.TEMPERATURE_SENSOR, createDefaultTemperatureMeasurementClusterServer(), endpointId);
    }
}

export class HumidityDevice extends SensorBaseDevice {
    constructor(endpointId?: number) {
        super(DEVICE.HUMIDITY_SENSOR, createDefaultWaterContentMeasurementClusterServer(), endpointId);
    }
}
export class LeafWetnessMeasurementDevice extends SensorBaseDevice {
    constructor(endpointId?: number) {
        super(DEVICE.HUMIDITY_SENSOR, createDefaultWaterContentMeasurementClusterServer(), endpointId);
    }
}
export class SoilMoistureMeasurementDevice extends SensorBaseDevice {
    constructor(endpointId?: number) {
        super(DEVICE.HUMIDITY_SENSOR, createDefaultWaterContentMeasurementClusterServer(), endpointId);
    }
}
