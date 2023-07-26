/**
 * @license
 * Copyright 2022-2023 Project CHIP Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { TlvTag, TlvTypeLength } from "./TlvCodec.js";
import { TlvReader, TlvSchema, TlvStream, TlvWriter } from "./TlvSchema.js";

/**
 * Schema to encode void.
 */
export class VoidSchema extends TlvSchema<void> {

    override encodeTlvInternal(_writer: TlvWriter, _value: void, _tag?: TlvTag): void {
        // Nothing to do
    }

    override decodeTlv(_encoded: TlvStream): void {
        // Nothing to do
    }

    override decodeTlvInternalValue(_reader: TlvReader, _typeLength: TlvTypeLength): void {
        throw new Error("decodeTlvInternalValue should never be called");
    }

    override validate(data: void): void {
        if (data !== undefined) throw new Error(`Expected void, got ${typeof data}.`);
    }
}

/** Void TLV schema. */
export const TlvVoid = new VoidSchema();
