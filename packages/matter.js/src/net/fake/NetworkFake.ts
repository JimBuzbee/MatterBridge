/**
 * @license
 * Copyright 2022-2023 Project CHIP Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { UdpChannelOptions, UdpChannel } from "../UdpChannel.js";
import { Network } from "../Network.js";
import { UdpChannelFake } from "./UdpChannelFake.js";
import { FAKE_INTERFACE_NAME } from "./SimulatedNetwork.js";

export class NetworkFake extends Network {
    constructor(
        private readonly mac: string,
        private readonly ips: string[],
    ) {
        super();
    }

    getNetInterfaces(): string[] {
        return [FAKE_INTERFACE_NAME];
    }

    getIpMac(_netInterface: string): { mac: string; ips: string[]; } {
        return { mac: this.mac, ips: this.ips };
    }

    override createUdpChannel(options: UdpChannelOptions): Promise<UdpChannel> {
        return UdpChannelFake.create(this, options);
    }
}
