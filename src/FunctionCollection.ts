
import { IFunctionCallParams } from './Controller/ControllerTypes.js';
import { LogicLib } from './FunctionLibrary/BooleanLogic.js'


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
    functions: {[index: string]: IFunction}
    getFunction: (opcode: number) => IFunction
    getFunctionName: (opcode: number) => string
}


// Load function libraries
const functionLibraries: IFunctionLibrary[] = [
    null,
    LogicLib
]

export function getFunction(libraryID: number, opcode: number): IFunction
{
    if (libraryID < 1 || libraryID >= functionLibraries.length) {
        console.error('Invalid function library id', libraryID); return null;
    }
    const library = functionLibraries[libraryID];

    if (opcode >= Object.keys(library.functions).length) {
        console.error('Invalid function opcode', opcode); return null;
    }
    const func = library.getFunction(opcode); 
    return func;
}

export function getFunctionName(libraryID: number, opcode: number): string
{
    if (libraryID < 1 || libraryID >= functionLibraries.length) {
        console.error('Invalid function library id', libraryID); return null;
    }
    const library = functionLibraries[libraryID];

    if (opcode >= Object.keys(library.functions).length) {
        console.error('Invalid function opcode', opcode); return null;
    }
    const name = library.getFunctionName(opcode); 
    return name;    
}