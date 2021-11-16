import { FunctionBlock } from "../FunctionBlock.js"
import { createFunctionCollection } from './CommonLib.js'

export const LogicLibDefinitions = createFunctionCollection(
{
    AND: {
        name: 'AND',
        symbol: '&',
        visualStyle: 'minimal',
        description: 'Logical AND function',
        inputs: [
            { name: '0', value: 1, datatype: 'BINARY' },
            { name: '1', value: 1, datatype: 'BINARY' },
        ],
        outputs: [
            { name: 'out', value: 1, datatype: 'BINARY' },
        ],
        variableInputs: {
            min: 2, max: 32, initialCount: 2
        }
    },

    OR: {
        name: 'OR',
        symbol: '≥1',
        visualStyle: 'minimal',
        description: 'Logical OR function',
        inputs: [
            { name: '0', value: 0, datatype: 'BINARY' },
            { name: '1', value: 0, datatype: 'BINARY' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'BINARY' },
        ],
        variableInputs: {
            min: 2, max: 32, initialCount: 2
        }
    },

    RS: {
        name: 'RS',
        visualStyle: 'no title min',
        description: 'Set-Reset flip-flop with dominant reset',
        inputs: [
            { name: 'S', value: 0, datatype: 'BINARY' },
            { name: 'R', value: 0, datatype: 'BINARY' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'BINARY' },
        ]
    },

    RisingEdge: {
        name: 'Rising edge',
        symbol: '_|‾',
        visualStyle: 'minimal',
        description: 'Rising signal edge detector (0 -> 1)',
        inputs: [
            { name: 'input', value: 0, datatype: 'BINARY' }
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'BINARY' }
        ],
        staticVariables: {
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
    declare protected staticVariables: typeof LogicLibDefinitions.RisingEdge.staticVariables

    protected run = ([input]) => {
        const out = ( !this.staticVariables.prev && input) ? 1 : 0
        this.staticVariables.prev = input
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