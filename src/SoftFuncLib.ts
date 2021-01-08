import {IFunction, IO_FLAG, IO_TYPE, IFunctionLibrary} from './SoftTypes.js'

const AND: IFunction =
{
    name: 'AND',
    inputs: [
        { initValue: 1, flags: IO_TYPE.BOOL },
        { initValue: 1, flags: IO_TYPE.BOOL } ],
    outputs: [
        { initValue: 1, flags: IO_TYPE.BOOL } ],

    variableInputCount: {min: 2, max: 64},

    run(params, values) {
        let out = 1;
        for (let i = 0; i < params.inputCount; i++) {
            out *= values[params.input + i];
        }
        values[params.output] = out ? 1 : 0;
    }
}

const OR: IFunction =
{
    name: 'OR',
    inputs: [
        { initValue: 0, flags: IO_TYPE.BOOL },
        { initValue: 0, flags: IO_TYPE.BOOL } ],
    outputs: [
        { initValue: 0, flags: IO_TYPE.BOOL } ],

    variableInputCount: {min: 2, max: 64},

    run(params, values) {
        let out = 0;
        for (let i = 0; i < params.inputCount; i++) {
            out += values[params.input + i];
        }
        values[params.output] = out ? 1 : 0;
    }
}

const XOR: IFunction =
{
    name: 'XOR',
    inputs: [
        { initValue: 0, flags: IO_TYPE.BOOL },
        { initValue: 0, flags: IO_TYPE.BOOL } ],
    outputs: [
        { initValue: 0, flags: IO_TYPE.BOOL } ],

    run(params, values) {
        const a = values[params.input + 0];
        const b = values[params.input + 1];

        values[params.output] = ((a && !b) || (a! && b)) ? 1 : 0;
    }
}

const NOT: IFunction =
{
    name: 'NOT',
    inputs: [
        { initValue: 0, flags: IO_TYPE.BOOL } ],
    outputs: [
        { initValue: 1, flags: IO_TYPE.BOOL } ],

    run(params, values) {
        values[params.output] = values[params.input] ? 0 : 1;
    }
}

const EDGE_UP: IFunction =
{
    name: '_|‾',
    inputs: [
        { initValue: 0, flags: IO_TYPE.BOOL } ],
    outputs: [
        { initValue: 0, flags: IO_TYPE.BOOL } ],

    staticCount: 1,

    run(params, values) {
        values[params.output] = values[params.input] && !values[params.static] ? 1 : 0;
        values[params.static] = values[params.input]
    }
}

const EDGE_DOWN: IFunction =
{
    name: '‾|_',
    inputs: [
        { initValue: 0, flags: IO_TYPE.BOOL } ],
    outputs: [
        { initValue: 0, flags: IO_TYPE.BOOL } ],

    staticCount: 1,

    run(params, values) {
        values[params.output] = !values[params.input] && values[params.static] ? 1 : 0;
        values[params.static] = values[params.input]
    }
}

const RS: IFunction =
{
    name: 'RS',
    inputs: [
        { name: 'R', initValue: 0, flags: IO_TYPE.BOOL },
        { name: 'S', initValue: 0, flags: IO_TYPE.BOOL } ],
    outputs: [
        { initValue: 0, flags: IO_TYPE.BOOL } ],
    
    staticCount: 1,

    run(params, values) {
        const R = values[params.input + 0]
        const S = values[params.input + 1]

        if (R) values[params.output] = 0;
        else if (S) values[params.output] = 1;
    }
}


export const LogicLib: IFunctionLibrary =
{
    name: 'Boolean Logic',
    functions: {    //   opcode
        AND,        //      0
        OR,         //      1
        XOR,        //      2
        NOT,        //      3
        EDGE_UP,    //      4
        EDGE_DOWN,  //      5
        RS          //      6
    },
    getFunction(opcode: number) {
        return Object.values(this.functions)[opcode] as IFunction;
    },
    getFunctionName(opcode: number) {
        return Object.keys(this.functions)[opcode]
    }
}