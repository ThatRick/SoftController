// Read a struct from buffer
export function readStruct(buffer, startByteOffset, struct) {
    let offset = startByteOffset;
    const view = new DataView(buffer);
    const obj = { _size: undefined };
    const readValue = (type) => {
        let value;
        switch (type) {
            case 0 /* int8 */:
                value = view.getInt8(offset);
                offset += 1;
                break;
            case 1 /* uint8 */:
                value = view.getUint8(offset);
                offset += 1;
                break;
            case 2 /* int16 */:
                value = view.getInt16(offset, true);
                offset += 2;
                break;
            case 3 /* uint16 */:
                value = view.getUint16(offset, true);
                offset += 2;
                break;
            case 4 /* int32 */:
                value = view.getInt32(offset, true);
                offset += 4;
                break;
            case 5 /* uint32 */:
                value = view.getUint32(offset, true);
                offset += 4;
                break;
            case 6 /* float */:
                value = view.getFloat32(offset, true);
                offset += 4;
                break;
            case 7 /* double */:
                value = view.getFloat64(offset, true);
                offset += 8;
                break;
        }
        ;
        return value;
    };
    // Iterate all structure elements
    for (const variable in struct) {
        const type = struct[variable];
        obj[variable] = readValue(type);
    }
    ;
    obj._size = offset - startByteOffset;
    return obj;
}
// Read an array of structs from buffer
export function readStructArray(buffer, startByteOffset, struct) {
    let offset = startByteOffset;
    const view = new DataView(buffer);
    const len = Math.floor((buffer.byteLength - startByteOffset) / sizeOfStruct(struct));
    const array = new Array(len);
    console.log('Read Struct Array: len = %d / %d = %d\n', (buffer.byteLength - startByteOffset), sizeOfStruct(struct), len);
    // Iterate all array elements
    for (let i = 0; i < len; i++) {
        const obj = readStruct(buffer, offset, struct);
        offset += obj._size;
        array.push(obj);
    }
    return array;
}
// Write a struct to buffer. Return number of bytes written.
export function writeStruct(buffer, startByteOffset, struct, values) {
    // console.log('write struct: ', {buffer, startOffset}, struct, values);
    let offset = startByteOffset;
    const view = new DataView(buffer);
    const writeValue = (type, value) => {
        switch (type) {
            case 0 /* int8 */:
                view.setInt8(offset, value);
                offset += 1;
                break;
            case 1 /* uint8 */:
                view.setUint8(offset, value);
                offset += 1;
                break;
            case 2 /* int16 */:
                view.setInt16(offset, value, true);
                offset += 2;
                break;
            case 3 /* uint16 */:
                view.setUint16(offset, value, true);
                offset += 2;
                break;
            case 4 /* int32 */:
                view.setInt32(offset, value, true);
                offset += 4;
                break;
            case 5 /* uint32 */:
                view.setUint32(offset, value, true);
                offset += 4;
                break;
            case 6 /* float */:
                view.setFloat32(offset, value, true);
                offset += 4;
                break;
            case 7 /* double */:
                view.setFloat64(offset, value, true);
                offset += 8;
                break;
        }
        ;
    };
    // Iterate all structure elements
    for (const variable in struct) {
        const type = struct[variable];
        const value = values[variable] | 0;
        writeValue(type, value);
    }
    ;
    // return number of bytes written
    return offset - startByteOffset;
}
// Get struct size in bytes
export function sizeOfStruct(struct) {
    let size = 0;
    Object.values(struct).forEach(type => {
        switch (type) {
            case 0 /* int8 */:
                size += 1;
                break;
            case 1 /* uint8 */:
                size += 1;
                break;
            case 2 /* int16 */:
                size += 2;
                break;
            case 3 /* uint16 */:
                size += 2;
                break;
            case 4 /* int32 */:
                size += 4;
                break;
            case 5 /* uint32 */:
                size += 4;
                break;
            case 6 /* float */:
                size += 4;
                break;
            case 7 /* double */:
                size += 8;
                break;
        }
    });
    return size;
}
export function sizeOfType(type) {
    let size;
    switch (type) {
        case 0 /* int8 */:
            size = 1;
            break;
        case 1 /* uint8 */:
            size = 1;
            break;
        case 2 /* int16 */:
            size = 2;
            break;
        case 3 /* uint16 */:
            size = 2;
            break;
        case 4 /* int32 */:
            size = 4;
            break;
        case 5 /* uint32 */:
            size = 4;
            break;
        case 6 /* float */:
            size = 4;
            break;
        case 7 /* double */:
            size = 8;
            break;
    }
    return size;
}
