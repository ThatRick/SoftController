import { IOFlag, IODataType } from '../Controller/ControllerDataTypes.js'
import { IFunction, IFunctionLibrary } from '../FunctionCollection.js';

const PT1: IFunction =
{
    name: 'PT1',
    inputs: [
        { name: 'in', initValue: 0, flags: IODataType.FLOAT },
        { name: 'G', initValue: 1, flags: IODataType.FLOAT },
        { name: 'T1', initValue: 10, flags: IODataType.FLOAT } ],
    outputs: [
        { initValue: 0, flags: IODataType.FLOAT } ],
    
    run(params, values) {
        const input =   values[params.input + 0]
        const G =       values[params.input + 1]
        const T1 =      values[params.input + 2]
        const Y =       values[params.output]

        const out = (G * input + T1 / params.dt * Y)/(1 + T1 / params.dt)
        values[params.output] = out
    }
}


export const Filters: IFunctionLibrary =
{
    id: 3,
    name: 'Filters',
    functions: [    //   opcode
        PT1,        //      0
    ]
}
