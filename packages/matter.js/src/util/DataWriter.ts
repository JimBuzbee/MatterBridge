/**
 * @license
 * Copyright 2022-2023 Project CHIP Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ByteArray, Endian } from "./ByteArray.js";
import { toBigInt, toNumber } from "./Number.js";

/** Writer that auto-increments its offset after each write. */
// TODO: some research should be done to make sure this is most performant implementation.
export class DataWriter<E extends Endian> {
    private readonly littleEndian: boolean;
    private length = 0;
    private readonly chunks = new Array<ByteArray>();

    constructor(
        endian: E,
    ) {
        this.littleEndian = endian === Endian.Little;
    }

    writeUInt8(value: number | bigint) {
        this.chunks.push(new ByteArray([toNumber(value)]));
        this.length += 1;
    }

    writeUInt16(value: number | bigint) {
        const chunk = new ByteArray(2);
        new DataView(chunk.buffer, 0, 2).setUint16(0, toNumber(value), this.littleEndian);
        this.chunks.push(chunk);
        this.length += 2;
    }

    writeUInt32(value: number | bigint) {
        const chunk = new ByteArray(4);
        new DataView(chunk.buffer, 0, 4).setUint32(0, toNumber(value), this.littleEndian);
        this.chunks.push(chunk);
        this.length += 4;
    }

    writeUInt64(value: number | bigint) {
        const chunk = new ByteArray(8);
        new DataView(chunk.buffer, 0, 8).setBigUint64(0, toBigInt(value), this.littleEndian);
        this.chunks.push(chunk);
        this.length += 8;
    }

    writeInt8(value: number | bigint) {
        const chunk = new ByteArray(1);
        new DataView(chunk.buffer, 0, 1).setInt8(0, toNumber(value));
        this.chunks.push(chunk);
        this.length += 1;
    }

    writeInt16(value: number | bigint) {
        const chunk = new ByteArray(2);
        new DataView(chunk.buffer, 0, 2).setInt16(0, toNumber(value), this.littleEndian);
        this.chunks.push(chunk);
        this.length += 2;
    }

    writeInt32(value: number | bigint) {
        const chunk = new ByteArray(4);
        new DataView(chunk.buffer, 0, 4).setInt32(0, toNumber(value), this.littleEndian);
        this.chunks.push(chunk);
        this.length += 4;
    }

    writeInt64(value: number | bigint) {
        const chunk = new ByteArray(8);
        new DataView(chunk.buffer, 0, 8).setBigInt64(0, toBigInt(value), this.littleEndian);
        this.chunks.push(chunk);
        this.length += 8;
    }

    writeFloat(value: number) {
        const chunk = new ByteArray(4);
        new DataView(chunk.buffer, 0, 4).setFloat32(0, value, this.littleEndian);
        this.chunks.push(chunk);
        this.length += 4;
    }

    writeDouble(value: number) {
        const chunk = new ByteArray(8);
        new DataView(chunk.buffer, 0, 8).setFloat64(0, value, this.littleEndian);
        this.chunks.push(chunk);
        this.length += 8;
    }

    writeUtf8String(value: string) {
        const bytes = ByteArray.fromString(value);
        this.chunks.push(bytes);
        this.length += bytes.byteLength;
    }

    writeByteArray(value: ByteArray) {
        this.chunks.push(value);
        this.length += value.byteLength;
    }

    toByteArray() {
        if (this.chunks.length === 0) return new ByteArray(0);
        if (this.chunks.length === 1) return this.chunks[0];

        const result = new ByteArray(this.length);
        let offset = 0;
        this.chunks.forEach(chunck => {
            result.set(chunck, offset);
            offset += chunck.byteLength;
        });
        this.chunks.length = 0;
        this.chunks.push(result);

        return result;
    }
}
