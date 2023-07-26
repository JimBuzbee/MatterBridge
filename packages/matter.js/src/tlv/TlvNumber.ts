/**
 * @license
 * Copyright 2022-2023 Project CHIP Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { BitmapSchema, BitSchema, TypeFromBitSchema } from "../schema/BitmapSchema.js";
import {
    FLOAT32_MAX, FLOAT32_MIN, INT16_MAX, INT16_MIN, INT32_MAX, INT32_MIN, INT64_MAX, INT64_MIN, INT8_MAX, INT8_MIN,
    maxValue, minValue, UINT16_MAX, UINT32_MAX, UINT64_MAX, UINT8_MAX
} from "../util/Number.js";
import { TlvCodec, TlvLength, TlvTag, TlvType, TlvTypeLength } from "./TlvCodec.js";
import { TlvReader, TlvSchema, TlvWriter } from "./TlvSchema.js";
import { TlvWrapper } from "./TlvWrapper.js";
import { MatterCoreSpecificationV1_0 } from "../spec/Specifications.js";

/**
 * Schema to encode an unsigned integer in TLV.
 *
 * @see {@link MatterCoreSpecificationV1_0} § A.11.1
 */
export class TlvNumericSchema<T extends bigint | number> extends TlvSchema<T> {
    constructor(
        protected readonly type: TlvType.UnsignedInt | TlvType.SignedInt | TlvType.Float,
        protected readonly lengthProvider: (value: T) => TlvLength,
        protected readonly min?: T,
        protected readonly max?: T,
    ) {
        super();
    }

    override encodeTlvInternal(writer: TlvWriter, value: T, tag: TlvTag = {}): void {
        const typeLength = { type: this.type, length: this.lengthProvider(value) } as TlvTypeLength;
        writer.writeTag(typeLength, tag);
        writer.writePrimitive(typeLength, value);
    }

    override decodeTlvInternalValue(reader: TlvReader, typeLength: TlvTypeLength): T {
        if (typeLength.type !== this.type) throw new Error(`Unexpected type ${typeLength.type}, was expecting ${this.type}.`);
        return reader.readPrimitive(typeLength);
    }

    override validate(value: T): void {
        if (typeof value !== "number" && typeof value !== 'bigint') throw new Error(`Expected number, got ${typeof value}.`);
        this.validateBoundaries(value);
    }

    validateBoundaries(value: T): void {
        if (this.min !== undefined && value < this.min) throw new Error(`Invalid value: ${value} is below the minimum, ${this.min}.`);
        if (this.max !== undefined && value > this.max) throw new Error(`Invalid value: ${value} is above the maximum, ${this.max}.`);
    }

    /** Restrict value range. */
    bound({ min, max }: NumericConstraints<T>): TlvNumericSchema<T> {
        return new TlvNumericSchema(this.type, this.lengthProvider, maxValue(min, this.min) as T, minValue(max, this.max) as T);
    }
}

export type NumericConstraints<T extends number | bigint = number | bigint> = {
    min?: T,
    max?: T,
};

export class TlvNumberSchema extends TlvNumericSchema<number> {
    constructor(
        type: TlvType.UnsignedInt | TlvType.SignedInt | TlvType.Float,
        lengthProvider: (value: number) => TlvLength,
        min?: number,
        max?: number,
    ) {
        super(type, lengthProvider, min, max);
    }

    override decodeTlvInternalValue(reader: TlvReader, typeLength: TlvTypeLength) {
        const value = super.decodeTlvInternalValue(reader, typeLength);
        return typeof value === "bigint" ? Number(value) : value;
    }

    override bound({ min, max }: NumericConstraints<number>): TlvNumericSchema<number> {
        return new TlvNumberSchema(
            this.type,
            this.lengthProvider,
            maxValue(min, this.min),
            minValue(max, this.max),
        );
    }

    override validate(value: number): void {
        if (typeof value !== "number") throw new Error(`Expected number, got ${typeof value}.`);
        this.validateBoundaries(value);
    }
}

export const TlvLongNumberSchema = TlvNumericSchema<number | bigint>;


/** Unsigned integer TLV schema. */
export const TlvFloat = new TlvNumberSchema(TlvType.Float, _value => TlvLength.FourBytes, FLOAT32_MIN, FLOAT32_MAX);
export const TlvDouble = new TlvNumberSchema(TlvType.Float, _value => TlvLength.EightBytes);
export const TlvInt8 = new TlvNumberSchema(TlvType.SignedInt, value => TlvCodec.getIntTlvLength(value), INT8_MIN, INT8_MAX);
export const TlvInt16 = new TlvNumberSchema(TlvType.SignedInt, value => TlvCodec.getIntTlvLength(value), INT16_MIN, INT16_MAX);
export const TlvInt32 = new TlvNumberSchema(TlvType.SignedInt, value => TlvCodec.getIntTlvLength(value), INT32_MIN, INT32_MAX);
export const TlvInt64 = new TlvLongNumberSchema(TlvType.SignedInt, value => TlvCodec.getIntTlvLength(value), INT64_MIN, INT64_MAX);
export const TlvUInt8 = new TlvNumberSchema(TlvType.UnsignedInt, value => TlvCodec.getUIntTlvLength(value), 0, UINT8_MAX);
export const TlvUInt16 = new TlvNumberSchema(TlvType.UnsignedInt, value => TlvCodec.getUIntTlvLength(value), 0, UINT16_MAX);
export const TlvUInt32 = new TlvNumberSchema(TlvType.UnsignedInt, value => TlvCodec.getUIntTlvLength(value), 0, UINT32_MAX);
export const TlvUInt64 = new TlvLongNumberSchema(TlvType.UnsignedInt, value => TlvCodec.getUIntTlvLength(value), 0, UINT64_MAX);
export const TlvEnum = <T>() => TlvUInt32 as TlvSchema<number> as TlvSchema<T>;
export const TlvBitmap = <T extends BitSchema>(underlyingSchema: TlvNumberSchema, bitSchema: T) => {
    const bitmapSchema = BitmapSchema(bitSchema);
    return new TlvWrapper(underlyingSchema, (bitmapData: TypeFromBitSchema<T>) => bitmapSchema.encode(bitmapData), value => bitmapSchema.decode(value));
};
