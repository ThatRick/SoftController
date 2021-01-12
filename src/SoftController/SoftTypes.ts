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
export interface IFunctionParams
{
    inputCount:     number,
    outputCount:    number,
    staticCount:    number,
    input:          number,
    output:         number,
    static:         number,
    dt:             number
}

export function getIOType(flags: number) {
    return (flags & IOTypeBitMask) as IO_TYPE
}

export function setIOType(flags: number, ioType: IO_TYPE) {
    return (flags & ~IOTypeBitMask) | ioType
}

export const BYTES_PER_VALUE = 4
export const BYTES_PER_REF = 4

export function alignBytes(addr: number, bytes = BYTES_PER_VALUE) {
    return Math.ceil(addr / bytes) * bytes;
}

export const enum IO_TYPE
{
    REAL =  0,
    INT =   1,
    BOOL =  2,
}

// IO FLAGS
export const enum IO_FLAG
{
    TYPE_BIT0 =     (1 << 0),
    TYPE_BIT1 =     (1 << 1),
    TYPE_BIT2 =     (1 << 2),
    INVERTED =      (1 << 3),
    HIDDEN =        (1 << 4)
}

const IOTypeBitMask = (IO_FLAG.TYPE_BIT0 | IO_FLAG.TYPE_BIT1 | IO_FLAG.TYPE_BIT2)

interface IOInfo {
    initValue:  number
    flags:      number
    name?:      string
}

// FUNCTION
export interface IFunction
{
    name: string
    inputs: IOInfo[]
    outputs: IOInfo[]

    staticCount?: number

    variableInputCount?: {min: number, max: number}
    variableOutputCount?: {min: number, max: number}
    variableStaticCount?: {min: number, max: number}

    init?:  (params: IFunctionParams, values: Float32Array) => void
    run:    (params: IFunctionParams, values: Float32Array) => void
}

// FUNCTION LIBRARY
export interface IFunctionLibrary
{
    name: string
    functions: {[index: string]: IFunction}
    getFunction: (opcode: number) => IFunction
    getFunctionName: (opcode: number) => string
}