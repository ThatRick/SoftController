
import { IFunctionCallParams } from './Controller/ControllerDataTypes.js';
import { BooleanLogic } from './FunctionLibrary/BooleanLogic.js'
import { Arithmetic } from './FunctionLibrary/Arithmetic.js'
import { Filters } from './FunctionLibrary/Filters.js'

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
    id: number
    name: string
    functions: IFunction[]
}

class FunctionCollection
{
    constructor(libraries: IFunctionLibrary[])
    {
        libraries.forEach(lib => this.libraryMap.set(lib.id, lib))
    }
    
    private libraryMap = new Map<number, IFunctionLibrary>()

    get libraries() {
        return Array.from(this.libraryMap.values())
    }
    
    getFunction(libID: number, opcode: number) {
        const lib = this.libraryMap.get(libID)
        if (!lib) {
            console.error('Invalid function library id', libID)
            return
        }
        const func = lib?.functions[opcode]
        if (!func) {
            console.error('Invalid function opcode', opcode)
            return
        }
        return func
    }

    getFunctionName(libID: number, opcode: number) {
        return this.getFunction(libID, opcode)?.name
    }
}

export const instructions = new FunctionCollection([
    BooleanLogic,
    Arithmetic,
    Filters
])