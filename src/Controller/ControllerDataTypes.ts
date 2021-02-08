import {DataType, StructType, defineStruct } from '../Lib/TypedStructs.js'

export type ID = number
export type DB = number
export type REF = number

type bytesize = number

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
export const DatablockHeaderStruct = defineStruct(
{
    byteLength: DataType.uint32,
    type:       DataType.uint8,
    flags:      DataType.uint8,
    parentID:   DataType.uint16,
})
export type IDatablockHeader = StructType<typeof DatablockHeaderStruct>


// FUNCTION DATA HEADER
export const FunctionHeaderStruct = defineStruct(
{
    library:        DataType.uint8,
    opcode:         DataType.uint8,
    inputCount:     DataType.uint8,
    outputCount:    DataType.uint8,
    staticCount:    DataType.uint16,
    functionFlags:  DataType.uint16,
})
export type IFunctionHeader = StructType<typeof FunctionHeaderStruct>


// TASK DATA
export const TaskStruct = defineStruct(
{
    targetRef:      DataType.uint32,    // Reference of callable circuit or function 
    interval_ms:    DataType.float,     // time interval between calls (ms)
    offset_ms:      DataType.float,     // time offset to spread cpu load between tasks with same interval (ms)
    timeAccu_ms:    DataType.float,     // time accumulator
    cpuTime_ms:     DataType.float,     // counts cpu milliseconds. Whole numbers are subracted and added to cpuTimeInt
    cpuTimeInt_ms:  DataType.uint32,    // counts whole number of cpu milliseconds
    runCount:       DataType.uint32     // counts number of calls
})
export type ITask = StructType<typeof TaskStruct>


// MONITOR VALUES DATA
export const MonitorValueChangeStruct = defineStruct(
{
    id:     DataType.uint16,
    ioNum:  DataType.uint16,
    value:  DataType.float
})
export type IMonitorValueChange = StructType<typeof MonitorValueChangeStruct>


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

export const enum FunctionFlag
{
    MONITOR =   (1 << 0)
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

export function getIODataType(flags: number) {
    return (flags & IOTypeBitMask) as IODataType
}

export function setIODataType(flags: number, ioType: IODataType) {
    return (flags & ~IOTypeBitMask) | ioType
}