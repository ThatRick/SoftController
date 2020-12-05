
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

export interface StructType
{
    [index: string]: DataType;
}

export interface Struct
{
    [index: string]: number;
}


// Read a struct from buffer
export function readStruct<T>(buffer: ArrayBuffer, startByteOffset: number, struct: StructType): T
{
    let offset = startByteOffset;
    const view = new DataView(buffer);
    const obj = {};

    const readValue = (type: DataType): number => {
        let value;
        switch(type) {
            case DataType.int8:         value = view.getInt8(offset);               offset += 1; break;
            case DataType.uint8:        value = view.getUint8(offset);              offset += 1; break;
            case DataType.int16:        value = view.getInt16(offset, true);        offset += 2; break;
            case DataType.uint16:       value = view.getUint16(offset, true);       offset += 2; break;
            case DataType.int32:        value = view.getInt32(offset, true);        offset += 4; break;
            case DataType.uint32:       value = view.getUint32(offset, true);       offset += 4; break;
            case DataType.float:        value = view.getFloat32(offset, true);      offset += 4; break;
            case DataType.double:       value = view.getFloat64(offset, true);      offset += 8; break;
        };
        return value;
    };

    // Iterate all structure elements
    for (const variable in struct) {
        const type = struct[variable];
        obj[variable] = readValue(type);
    };

    return obj as T;
}


// Read an array of structs from buffer
export function readStructArray<T>(buffer: ArrayBuffer, startByteOffset: number, struct: StructType): Array<T>
{
    let offset = startByteOffset;
    const structByteLength = sizeOfStruct(struct);
    const len = Math.floor((buffer.byteLength - startByteOffset) / structByteLength);
    const array = new Array<T>(len);
    console.log('Read Struct Array: len = %d / %d = %d\n', (buffer.byteLength - startByteOffset), sizeOfStruct(struct), len);


    // Iterate all array elements
    for (let i = 0; i < len; i++) {
        const elem = readStruct<T>(buffer, offset, struct);
        offset += structByteLength;
        array.push(elem);
    }

    return array;
}


// Write a struct to buffer. Return number of bytes written.
export function writeStruct(buffer: ArrayBuffer, startByteOffset: number, struct: StructType, values: Object): number
{
    // console.log('write struct: ', {buffer, startOffset}, struct, values);
    let offset = startByteOffset;
    const view = new DataView(buffer);

    const writeValue = (type: DataType, value: number) => {
        switch(type) {
            case DataType.int8:         view.setInt8(offset, value);               offset += 1; break;
            case DataType.uint8:        view.setUint8(offset, value);              offset += 1; break;
            case DataType.int16:        view.setInt16(offset, value, true);        offset += 2; break;
            case DataType.uint16:       view.setUint16(offset, value, true);       offset += 2; break;
            case DataType.int32:        view.setInt32(offset, value, true);        offset += 4; break;
            case DataType.uint32:       view.setUint32(offset, value, true);       offset += 4; break;
            case DataType.float:        view.setFloat32(offset, value, true);      offset += 4; break;
            case DataType.double:       view.setFloat64(offset, value, true);      offset += 8; break;
        };       
    };

    // Iterate all structure elements
    for (const variable in struct) {
        const type = struct[variable];
        const value = values[variable] | 0;
       
        writeValue(type, value);
    };
    // return number of bytes written
    return offset - startByteOffset;
}


// Get struct size in bytes
export function sizeOfStruct(struct: StructType) {
    let size = 0;
    Object.values(struct).forEach(type => {
        switch(type) {
            case DataType.int8:     size += 1; break;
            case DataType.uint8:    size += 1; break;
            case DataType.int16:    size += 2; break;
            case DataType.uint16:   size += 2; break;
            case DataType.int32:    size += 4; break;
            case DataType.uint32:   size += 4; break;
            case DataType.float:    size += 4; break;
            case DataType.double:   size += 8; break;
        }
    }); 
    return size;
}

export function sizeOfType(type: DataType): number {
    let size: number
    
    switch(type) {
        case DataType.int8:     size = 1; break;
        case DataType.uint8:    size = 1; break;
        case DataType.int16:    size = 2; break;
        case DataType.uint16:   size = 2; break;
        case DataType.int32:    size = 4; break;
        case DataType.uint32:   size = 4; break;
        case DataType.float:    size = 4; break;
        case DataType.double:   size = 8; break;
    }
    return size;
}