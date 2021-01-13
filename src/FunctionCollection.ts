
import { IFunctionCallParams } from './Controller/ControllerDataTypes.js';
import { BooleanLogic } from './FunctionLibrary/BooleanLogic.js'


// FUNCTION
interface IOInfo
{
    initValue:  number
    flags:      number
    name?:      string
}

export interface IFunction
{
    name: string
    inputs: IOInfo[]
    outputs: IOInfo[]

    staticCount?: number

    variableInputCount?: {min: number, max: number}
    variableOutputCount?: {min: number, max: number}
    variableStaticCount?: {min: number, max: number}

    init?:  (params: IFunctionCallParams, values: Float32Array) => void
    run:    (params: IFunctionCallParams, values: Float32Array) => void
}

// FUNCTION LIBRARY
export interface IFunctionLibrary
{
    name: string
    functions: IFunction[]
}

// Load function libraries
const functionLibraries: IFunctionLibrary[] = [
    null,
    BooleanLogic
]

export function getFunction(libraryID: number, opcode: number): IFunction
{
    if (libraryID < 1 || libraryID >= functionLibraries.length) {
        console.error('Invalid function library id', libraryID)
        return null
    }
    const library = functionLibraries[libraryID]

    if (opcode >= library.functions.length) {
        console.error('Invalid function opcode', opcode)
        return null
    }
    const func = library.functions[opcode]
    if (!func) console.error('Error getting library function', libraryID, opcode)
    return func
}

export function getFunctionName(libraryID: number, opcode: number): string
{
    const func = getFunction(libraryID, opcode)
    return func?.name
}