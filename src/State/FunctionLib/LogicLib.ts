import { FunctionBlock } from "../FunctionBlock.js"
import { createFunctionCollection } from './CommonLib.js'

export const LogicLibDefinitions = createFunctionCollection(
{
    AND: {
        name: 'AND',
        symbol: '&',
        visualStyle: 'minimal',
        description: 'Logical AND function',
        inputs: {
            0: { value: 1, dataType: 'BINARY' },
            1: { value: 1, dataType: 'BINARY' },
        },
        outputs: {
            out: { value: 1, dataType: 'BINARY' },
        },
        variableInputs: {
            min: 2, max: 32, initialCount: 2
        }
    },

    OR: {
        name: 'OR',
        symbol: '≥1',
        visualStyle: 'minimal',
        description: 'Logical OR function',
        inputs: {
            0: { value: 0, dataType: 'BINARY' },
            1: { value: 0, dataType: 'BINARY' },
        },
        outputs: {
            out: { value: 0, dataType: 'BINARY' },
        },
        variableInputs: {
            min: 2, max: 32, initialCount: 2
        }
    },

    RS: {
        name: 'RS',
        visualStyle: 'no title min',
        description: 'Set-Reset flip-flop with dominant reset',
        inputs: {
            S: { value: 0, dataType: 'BINARY' },
            R: { value: 0, dataType: 'BINARY' },
        },
        outputs: {
            out: { value: 0, dataType: 'BINARY' },
        }
    },

    RisingEdge: {
        name: 'Rising edge',
        symbol: '_|‾',
        visualStyle: 'minimal',
        description: 'Rising signal edge detector (0 -> 1)',
        inputs: {
            input: { value: 0, dataType: 'BINARY' }
        },
        outputs: {
            out: { value: 0, dataType: 'BINARY' }
        },
        statics: {
            prev: 0
        }
    },
})


class AND extends FunctionBlock
{
    constructor() { super(LogicLibDefinitions.AND) }
    protected run = (inputs: number[]) => inputs.reduce((output, input) => output *= input, 1) ? 1 : 0
}

class OR extends FunctionBlock
{
    constructor() { super(LogicLibDefinitions.OR) }
    protected run = (inputs: number[]) => inputs.reduce((output, input) => output += input, 0) ? 1 : 0
}

class RS extends FunctionBlock
{
    constructor() { super(LogicLibDefinitions.RS) }
    protected run = ([S, R], [out]) => {
        S && (out = 1)
        R && (out = 0)
        return out
    }
}

class RisingEdge extends FunctionBlock
{
    constructor() { super(LogicLibDefinitions.RisingEdge) }
    protected statics: typeof LogicLibDefinitions.RisingEdge.statics

    protected run = ([input]) => {
        const out = ( !this.statics.prev && input) ? 1 : 0
        this.statics.prev = input
        return out
    }
}

export const logicLib =
{
    AND,
    OR,
    RS,
    RisingEdge,
}