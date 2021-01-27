import { IOFlag, IODataType } from '../Controller/ControllerDataTypes.js'
import { IFunction, IFunctionLibrary } from '../FunctionCollection.js';

const ADD: IFunction =
{
    name: '+',
    inputs: [
        { initValue: 0, flags: IODataType.FLOAT },
        { initValue: 0, flags: IODataType.FLOAT } ],
    outputs: [
        { initValue: 0, flags: IODataType.FLOAT } ],

    variableInputCount: {min: 2, max: 64},

    run(params, values) {
        let out = 0;
        for (let i = 0; i < params.inputCount; i++) {
            out += values[params.input + i];
        }
        values[params.output] = out;
    }
}

const SUB: IFunction =
{
    name: '-',
    inputs: [
        { initValue: 0, flags: IODataType.FLOAT },
        { initValue: 0, flags: IODataType.FLOAT } ],
    outputs: [
        { initValue: 0, flags: IODataType.FLOAT } ],

    run(params, values) {
        const a = values[params.input + 0];
        const b = values[params.input + 1];
        values[params.output] = a - b;
    }
}

const MUL: IFunction =
{
    name: 'x',
    inputs: [
        { initValue: 1, flags: IODataType.FLOAT },
        { initValue: 1, flags: IODataType.FLOAT } ],
    outputs: [
        { initValue: 1, flags: IODataType.FLOAT } ],

    variableInputCount: {min: 2, max: 64},

    run(params, values) {
        let out = 1;
        for (let i = 0; i < params.inputCount; i++) {
            out *= values[params.input + i];
        }
        values[params.output] = out;
    }
}

const DIV: IFunction =
{
    name: '/',
    inputs: [
        { initValue: 1, flags: IODataType.FLOAT },
        { initValue: 1, flags: IODataType.FLOAT } ],
    outputs: [
        { initValue: 1, flags: IODataType.FLOAT },
        { name: 'e', initValue: 0, flags: IODataType.BINARY } ],

    run(params, values) {
        const a = values[params.input + 0];
        const b = values[params.input + 1];
        if (b == 0) {
            values[params.output] = 0;
            values[params.output + 1] = 1;
        } else {
            values[params.output] = a / b;
            values[params.output + 1] = 0;
        }
    }
}

export const Arithmetic: IFunctionLibrary =
{
    id: 2,
    name: 'Arithmetic',
    functions: [    //  opcode
        ADD,        //    0              
        SUB,        //    1
        MUL,        //    2
        DIV         //    3
    ]
}