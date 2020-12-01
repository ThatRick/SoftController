import {DataType, StructType, sizeOfStruct, sizeOfType, readStruct, writeStruct} from './TypedStructs'

export interface IORef {
    datablockId: number,
    ioNum: number
}

export type pointer = number
export type bytesize = number
export type ID = number

export enum DatablockType {
    CIRCUIT,
    FUNCTION,
    DATA
}

// DATA BLOCK HEADER [8 bytes]
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

// FUNCTION DATA HEADER [8 bytes]
export interface IFunctionHeader
{
    library:        number,
    opcode:         number,
    funcFlags:      number,
    inputCount:     number,
    outputCount:    number,
    staticCount:    number,
    reserve:        number
}

export const FunctionHeaderStruct: StructType =
{
    library:        DataType.uint8,
    opcode:         DataType.uint8,
    funcFlags:      DataType.uint8,
    inputCount:     DataType.uint8,
    outputCount:    DataType.uint8,
    staticCount:    DataType.uint8,
    reserve:        DataType.uint16
}
export const functionHeaderByteLength = sizeOfStruct(FunctionHeaderStruct);


// FUNCTIO PARAMETERS
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
    INVERTED =      (1 << 3)
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

    init?:  (params: IFunctionParams, values: Float32Array) => void
    run:    (params: IFunctionParams, values: Float32Array) => void
}

// FUNCTION LIBRARY
export interface IFunctionLibrary
{
    name: string,
    functions: {[index: string]: IFunction}
}

