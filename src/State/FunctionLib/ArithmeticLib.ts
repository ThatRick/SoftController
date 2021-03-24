import { FunctionBlock } from "../FunctionBlock.js"
import { createFunctionCollection } from './CommonLib.js'

export const ArithmeticLibDefinitions = createFunctionCollection (
{
    ADD: {
        name: 'Addition',
        symbol: '+',
        visualStyle: 'minimal',
        description: 'Add float values',
        inputs: {
            0: { value: 0, dataType: 'FLOAT' },
            1: { value: 0, dataType: 'FLOAT' },
        },
        outputs: {
            out: { value: 0, dataType: 'FLOAT' },
        },
        variableInputs: {
            min: 2, max: 32, initialCount: 2
        }
    },

    SUB: {
        name: 'Substract',
        symbol: '-',
        visualStyle: 'minimal',
        description: 'Substract float values',
        inputs: {
            0: { value: 0, dataType: 'FLOAT' },
            1: { value: 0, dataType: 'FLOAT' },
        },
        outputs: {
            out: { value: 0, dataType: 'FLOAT' },
        },
    },

    MUL: {
        name: 'Multiply',
        symbol: 'x',
        visualStyle: 'minimal',
        description: 'Multiply float values',
        inputs: {
            0: { value: 1, dataType: 'FLOAT' },
            1: { value: 1, dataType: 'FLOAT' },
        },
        outputs: {
            out: { value: 1, dataType: 'FLOAT' },
        },
        variableInputs: {
            min: 2, max: 32, initialCount: 2
        }
    },

    DIV: {
        name: 'Division',
        symbol: '÷',
        visualStyle: 'minimal',
        description: 'Divide float values',
        inputs: {
            0: { value: 1, dataType: 'FLOAT' },
            1: { value: 1, dataType: 'FLOAT' },
        },
        outputs: {
            out: { value: 1, dataType: 'FLOAT' },
            err: { value: 0, dataType: 'BINARY' }
        },
    },
})


class ADD extends FunctionBlock
{
    constructor() { super(ArithmeticLibDefinitions.ADD) }
    protected run = (inputs: number[]) => inputs.reduce((output, input) => output += input, 0)
}

class SUB extends FunctionBlock
{
    constructor() { super(ArithmeticLibDefinitions.SUB) }
    protected run = ([a, b]) => a - b
}

class MUL extends FunctionBlock
{
    constructor() { super(ArithmeticLibDefinitions.MUL) }
    protected run = (inputs: number[]) => inputs.reduce((output, input) => output *= input, 1)
}

class DIV extends FunctionBlock
{
    constructor() { super(ArithmeticLibDefinitions.DIV) }
    protected run = ([a, b]) => (b == 0) ? [0, 1] : [a / b, 0]
}


export const arithmeticLib =
{
    ADD,
    SUB,
    MUL,
    DIV
}