import {DataType, StructDataTypes, sizeOfStruct, sizeOfType, readStruct, writeStruct} from '../Lib/TypedStructs.js'

export type pointer = number
export type bytesize = number
export type ID = number

export const enum DatablockType {
    UNDEFINED,
    UNALLOCATED,
    TASK,
    CIRCUIT,
    FUNCTION,
    DATA
}

// IO REFERENCE
export interface IORef {
    id: number,
    ioNum: number
}

// DATA BLOCK HEADER
export type IDatablockHeader =
{
    byteLength: bytesize
    type:       DatablockType
    flags:      number
    parentID:   number
}
export const DatablockHeaderStruct: StructDataTypes<IDatablockHeader> =
{
    byteLength: DataType.uint32,
    type:       DataType.uint8,
    flags:      DataType.uint8,
    parentID:   DataType.uint16,
}
export const datablockHeaderByteLength = sizeOfStruct(DatablockHeaderStruct);


// FUNCTION DATA HEADER
export type IFunctionHeader =
{
    library:        number,
    opcode:         number,
    inputCount:     number,
    outputCount:    number,
    staticCount:    number,
    functionFlags:  number,
}

export const FunctionHeaderStruct: StructDataTypes<IFunctionHeader> =
{
    library:        DataType.uint8,
    opcode:         DataType.uint8,
    inputCount:     DataType.uint8,
    outputCount:    DataType.uint8,
    staticCount:    DataType.uint16,
    functionFlags:  DataType.uint16,
}
export const functionHeaderByteLength = sizeOfStruct(FunctionHeaderStruct);


// TASK DATA
export type ITask =
{
    targetRef:      number              // Reference of callable circuit or function 
    interval:       number              // time interval between calls (ms)
    offset:         number              // time offset to spread cpu load between tasks with same interval (ms)
    timeAccu:       number              // time accumulator (ms)
    cpuTime:        number              // counts cpu milliseconds. Whole numbers are subracted and added to cpuTimeInt
    cpuTimeInt:     number              // counts whole number of cpu milliseconds
    runCount:       number              // counts number of calls
}
export const TaskStruct: StructDataTypes<ITask> =
{
    targetRef:      DataType.uint32,    // Reference of callable circuit or function 
    interval:       DataType.float,     // time interval between calls (ms)
    offset:         DataType.float,     // time offset to spread cpu load between tasks with same interval (ms)
    timeAccu:       DataType.float,     // time accumulator
    cpuTime:        DataType.float,     // counts cpu milliseconds. Whole numbers are subracted and added to cpuTimeInt
    cpuTimeInt:     DataType.uint32,    // counts whole number of cpu milliseconds
    runCount:       DataType.uint32     // counts number of calls
}
export const taskStructByteLength = sizeOfStruct(TaskStruct)


// FUNCTION PARAMETERS
export interface IFunctionCallParams
{
    inputCount:     number,
    outputCount:    number,
    staticCount:    number,
    input:          number,
    output:         number,
    static:         number,
    dt:             number
}

export const BYTES_PER_VALUE = 4
export const BYTES_PER_REF = 4

export function alignBytes(addr: number, bytes = BYTES_PER_VALUE) {
    return Math.ceil(addr / bytes) * bytes;
}

export const enum IODataType
{
    FLOAT =  0,
    INTEGER =   1,
    BINARY =  2,
}

// IO FLAGS
export const enum IOFlag
{
    TYPE_BIT0 =     (1 << 0),
    TYPE_BIT1 =     (1 << 1),
    TYPE_BIT2 =     (1 << 2),
    INVERTED =      (1 << 3),
    HIDDEN =        (1 << 4)
}

const IOTypeBitMask = (IOFlag.TYPE_BIT0 | IOFlag.TYPE_BIT1 | IOFlag.TYPE_BIT2)

export function getIOType(flags: number) {
    return (flags & IOTypeBitMask) as IODataType
}

export function setIOType(flags: number, ioType: IODataType) {
    return (flags & ~IOTypeBitMask) | ioType
}