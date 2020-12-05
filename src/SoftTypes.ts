import {DataType, StructType, sizeOfStruct, sizeOfType, readStruct, writeStruct} from './TypedStructs'

export interface IORef {
    datablockId: number,
    ioNum: number
}

export type pointer = number
export type bytesize = number
export type ID = number

export enum DatablockType {
    TASKLIST,
    TASK,
    CIRCUIT,
    FUNCTION,
    DATA
}

// DATA BLOCK HEADER
export interface IDatablockHeader
{
    byteLength: bytesize
    type:       DatablockType
    flags:      number
    reserve:    number

}
export const DatablockHeaderStruct: StructType =
{
    byteLength: DataType.uint32,
    type:       DataType.uint8,
    flags:      DataType.uint8,
    reserve:    DataType.uint16
}
export const datablockHeaderByteLength = sizeOfStruct(DatablockHeaderStruct);


// FUNCTION DATA HEADER
export interface IFunctionHeader
{
    library:        number,
    opcode:         number,
    inputCount:     number,
    outputCount:    number,
    staticCount:    number,
    funcFlags:      number,
    reserve:        number
}
export const FunctionHeaderStruct: StructType =
{
    library:        DataType.uint8,
    opcode:         DataType.uint8,
    inputCount:     DataType.uint8,
    outputCount:    DataType.uint8,
    staticCount:    DataType.uint16,
    funcFlags:      DataType.uint8,
    reserve:        DataType.uint8
}
export const functionHeaderByteLength = sizeOfStruct(FunctionHeaderStruct);


// TASK DATA
export interface ITask
{
    targetID:       number              // ID of callable circuit or function 
    interval:       number              // time interval between calls (ms)
    offset:         number              // time offset to spread cpu load between tasks with same interval (ms)
    timeAccu:       number              // time accumulator (ms)
    runCount:       number              // counts number of calls
    cpuTimeInt:     number              // counts whole number of cpu milliseconds
    cpuTime:        number              // counts cpu milliseconds. Whole numbers are subracted and added to cpuTimeInt
}
export const TaskStruct: StructType =
{
    targetID:       DataType.uint32,    // ID of callable circuit or function 
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

// IO FLAGS
export const enum IO_FLAG
{
    BOOLEAN =       (1 << 1),
    INTEGER =       (1 << 2),
    INVERTED =      (1 << 3),
    HIDDEN =        (1 << 4)
}

interface IOInfo {
    initValue:  number
    flags:      number
    name?:      string
}

// FUNCTION
export interface IFunction
{
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
    name: string,
    functions: {[index: string]: IFunction}
}

