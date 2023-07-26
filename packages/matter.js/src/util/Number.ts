/**
 * @license
 * Copyright 2022-2023 Project CHIP Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export const UINT8_MAX = 0xFF;
export const UINT16_MAX = 0xFFFF;
export const UINT32_MAX = 0xFFFFFFFF;
export const UINT64_MAX = BigInt("18446744073709551615");

export const INT8_MIN = -128;
export const INT16_MIN = -32768;
export const INT32_MIN = -2147483648;
export const INT64_MIN = BigInt("-9223372036854775808");
export const INT8_MAX = 127;
export const INT16_MAX = 32767;
export const INT32_MAX = 2147483647;
export const INT64_MAX = BigInt("9223372036854775807");

export const FLOAT32_MIN = -340282346638528859811704183484516925440.0;
export const FLOAT32_MAX = 340282346638528859811704183484516925440.0;

export function toNumber(value: bigint | number): number {
    return typeof value === "bigint" ? Number(value) : value;
}

export function toBigInt(value: bigint | number): bigint {
    return typeof value === "number" ? BigInt(value) : value;
}

export function minValue<T extends bigint | number>(a: T | undefined, b: T | undefined) {
    if (a === undefined) return b;
    if (b === undefined) return a;
    return a < b ? a : b;
}

export function maxValue<T extends bigint | number>(a: T | undefined, b: T | undefined) {
    if (a === undefined) return b;
    if (b === undefined) return a;
    return a > b ? a : b;
}
