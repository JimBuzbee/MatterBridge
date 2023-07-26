/**
 * @license
 * Copyright 2022-2023 Project CHIP Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { TemperatureMeasurementCluster } from "../TemperatureMeasurementCluster.js";
import { RelativeHumidityCluster } from "../WaterContentMeasurementCluster.js";
import { ClusterServer } from "../../protocol/interaction/InteractionServer.js";

export const createDefaultTemperatureMeasurementClusterServer = () => new ClusterServer(
    TemperatureMeasurementCluster,
    {},
    {
        measuredValue: 1,
        minMeasuredValue: -27315,
        maxMeasuredValue: 32767,
    },
    ({})
);
export const createDefaultWaterContentMeasurementClusterServer = () => new ClusterServer(
    RelativeHumidityCluster,
    {},
    {
        measuredValue: 1,
        minMeasuredValue: 0,
        maxMeasuredValue: 10000,
    },
    ({})
);