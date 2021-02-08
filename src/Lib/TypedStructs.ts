
export const enum DataType {
    int8,
    uint8,
    int16,
    uint16,
    int32,
    uint32,
    float,
    double
}

export const enum DataSize {
    int8    =   1,
    uint8   =   1,
    int16   =   2,
    uint16  =   2,
    int32   =   4,
    uint32  =   4,
    float   =   4,
    double  =   8
}

// Little endian if true
const LE = true

export type StructDefinition =
{
    [name: string]: DataType 
}

export type StructValues =
{
    [name: string]: number
}

export type StructType<T> =
{
    [K in keyof Omit<T, 'STRUCT_BYTE_SIZE'>]: number
}

type ByteSize = { STRUCT_BYTE_SIZE: number }

export function defineStruct<T extends StructDefinition>(structDefinition: T) {
    const size = sizeOfStruct(structDefinition)
    Object.defineProperty(structDefinition, 'STRUCT_BYTE_SIZE', { value: size })
    return structDefinition as T & ByteSize
}

// Read a struct from buffer
export function readStruct<T extends StructDefinition>(buffer: ArrayBuffer, startByteOffset: number, struct: T): StructType<T>
{
    let offset = startByteOffset;
    const view = new DataView(buffer);
    const obj: {[index: string]: number} = {};

    const readValue = (type: DataType): number => {
        let value;
        switch(type) {
            case DataType.int8:         value = view.getInt8(offset);               offset += DataSize.int8;    break;
            case DataType.uint8:        value = view.getUint8(offset);              offset += DataSize.uint8;   break;
            case DataType.int16:        value = view.getInt16(offset, LE);          offset += DataSize.int16;   break;
            case DataType.uint16:       value = view.getUint16(offset, LE);         offset += DataSize.uint16;  break;
            case DataType.int32:        value = view.getInt32(offset, LE);          offset += DataSize.int32;   break;
            case DataType.uint32:       value = view.getUint32(offset, LE);         offset += DataSize.uint32;  break;
            case DataType.float:        value = view.getFloat32(offset, LE);        offset += DataSize.float;   break;
            case DataType.double:       value = view.getFloat64(offset, LE);        offset += DataSize.double;  break;
        };
        return value;
    };

    for (const variable in struct) {
        const type = struct[variable];
        obj[variable] = readValue(type);
    };

    return obj as StructType<T>;
}

// Read a struct from buffer
export function readStructElement<T extends StructDefinition>(buffer: ArrayBuffer, startByteOffset: number, struct: T, elementName: keyof T)
{
    let offset = startByteOffset;
    const view = new DataView(buffer);

    const readValue = (type: DataType): number => {
        let value;
        switch(type) {
            case DataType.int8:         value = view.getInt8(offset);               offset += DataSize.int8;    break;
            case DataType.uint8:        value = view.getUint8(offset);              offset += DataSize.uint8;   break;
            case DataType.int16:        value = view.getInt16(offset, LE);          offset += DataSize.int16;   break;
            case DataType.uint16:       value = view.getUint16(offset, LE);         offset += DataSize.uint16;  break;
            case DataType.int32:        value = view.getInt32(offset, LE);          offset += DataSize.int32;   break;
            case DataType.uint32:       value = view.getUint32(offset, LE);         offset += DataSize.uint32;  break;
            case DataType.float:        value = view.getFloat32(offset, LE);        offset += DataSize.float;   break;
            case DataType.double:       value = view.getFloat64(offset, LE);        offset += DataSize.double;  break;
        };
        return value;
    };

    // Iterate all structure elements
    for (const element in struct) {
        const type = struct[element];
        if (elementName == element) return readValue(type);
        else offset += sizeOfType(type);
    };
}

// Read an array of structs from buffer
export function readArrayOfStructs<T extends StructDefinition>(buffer: ArrayBuffer, startByteOffset: number, struct: T, len?: number): Array<StructType<T>>
{
    let offset = startByteOffset;
    const structByteLength = sizeOfStruct(struct);
    const maxLen = Math.floor((buffer.byteLength - startByteOffset) / structByteLength);
    len ||= maxLen;
    if (len > maxLen) {
        console.error('Read Struct Array: Buffer overflow. Given struct array length too big', len)
        len = maxLen
    }
    if ((buffer.byteLength - startByteOffset) % structByteLength != 0) console.error('Read Struct Array: Given buffer length is not a multiple of struct length')
    const array: StructType<T>[] = []
    // console.log('Read Struct Array: len = %d / %d = %d\n', (buffer.byteLength - startByteOffset), sizeOfStruct(struct), len);

    // Iterate all array elements
    for (let i = 0; i < len; i++) {
        const elem = readStruct<T>(buffer, offset, struct);
        offset += structByteLength;
        array.push(elem);
    }

    return array;
}


// Write a struct to buffer. Returns new offset (startByteOffset + bytes written)
// export function writeStruct<T extends StructValues>(buffer: ArrayBuffer, startByteOffset: number, struct: StructDataTypes<T>, values: T): number
export function writeStruct<T extends StructDefinition>(buffer: ArrayBuffer, startByteOffset: number, struct: T, values: Partial<StructType<T>>): number
{
    // console.log('write struct: ', {buffer, startOffset}, struct, values);
    let offset = startByteOffset;
    const view = new DataView(buffer);

    const writeValue = (type: DataType, value: number | undefined) => {
        switch(type) {
            case DataType.int8:         view.setInt8(offset, value);                offset += DataSize.int8;     break;
            case DataType.uint8:        view.setUint8(offset, value);               offset += DataSize.uint8;    break;
            case DataType.int16:        view.setInt16(offset, value, LE);           offset += DataSize.int16;    break;
            case DataType.uint16:       view.setUint16(offset, value, LE);          offset += DataSize.uint16;   break;
            case DataType.int32:        view.setInt32(offset, value, LE);           offset += DataSize.int32;    break;
            case DataType.uint32:       view.setUint32(offset, value, LE);          offset += DataSize.uint32;   break;
            case DataType.float:        view.setFloat32(offset, value, LE);         offset += DataSize.float;    break;
            case DataType.double:       view.setFloat64(offset, value, LE);         offset += DataSize.double;   break;
        };       
    };

    const assertedValues = values as {[index: string]: number}

    // Iterate all structure elements
    for (const element in struct) {
        const type = struct[element];
        const value = assertedValues[element];
       
        if (value == undefined) offset += sizeOfType(type);
        else writeValue(type, value);
    };
    // return new offset
    return offset;
}

export function writeStructElement<T extends StructDefinition>(buffer: ArrayBuffer, startByteOffset: number, struct: T, elementName: keyof T, newValue: number) {
    let offset = startByteOffset;
    const view = new DataView(buffer);

    const updateElement = (type: DataType, value: number | undefined) => {
        switch(type) {
            case DataType.int8:         view.setInt8(offset, value);                offset += DataSize.int8;    break;
            case DataType.uint8:        view.setUint8(offset, value);               offset += DataSize.uint8;   break;
            case DataType.int16:        view.setInt16(offset, value, LE);           offset += DataSize.int16;   break;
            case DataType.uint16:       view.setUint16(offset, value, LE);          offset += DataSize.uint16;  break;
            case DataType.int32:        view.setInt32(offset, value, LE);           offset += DataSize.int32;   break;
            case DataType.uint32:       view.setUint32(offset, value, LE);          offset += DataSize.uint32;  break;
            case DataType.float:        view.setFloat32(offset, value, LE);         offset += DataSize.float;   break;
            case DataType.double:       view.setFloat64(offset, value, LE);         offset += DataSize.double;  break;
        };       
    };

    // Iterate all structure elements
    for (const element in struct) {
        const type = struct[element];
        const value = (element == elementName) ? newValue : undefined;
        if (value == undefined) offset += sizeOfType(type);
        else updateElement(type, value);
    };
}

// Get struct size in bytes
export function sizeOfStruct(struct: StructDefinition) {
    let size = 0;
    Object.values(struct).forEach(type => {
        size += sizeOfType(type)
    }); 
    return size;
}

export function sizeOfType(type: DataType): number {
    switch(type) {
        case DataType.int8:     return DataSize.int8;
        case DataType.uint8:    return DataSize.uint8;
        case DataType.int16:    return DataSize.int16;
        case DataType.uint16:   return DataSize.uint16;
        case DataType.int32:    return DataSize.int32;
        case DataType.uint32:   return DataSize.uint32;
        case DataType.float:    return DataSize.float;
        case DataType.double:   return DataSize.double;
    }
}