
import { FunctionBlock, FunctionBlockDefinition } from "./FunctionBlock.js"

function createFunctionCollection <T extends {[name: string]: FunctionBlockDefinition }>(def: T) { return def }

export const FunctionDefinitions = createFunctionCollection(
{
    AND: {
        name: 'AND',
        symbol: '&',
        description: 'Logical AND function',
        inputs: {
            0: { value: 1, dataType: 'BINARY' },
            1: { value: 1, dataType: 'BINARY' },
        },
        outputs: {
            out: { value: 1, dataType: 'BINARY' },
        },
        variableInputs: {
            min: 2, max: 32, initial: 2
        }
    },

    OR: {
        name: 'OR',
        symbol: '≥1',
        description: 'Logical OR function',
        inputs: {
            0: { value: 0, dataType: 'BINARY' },
            1: { value: 0, dataType: 'BINARY' },
        },
        outputs: {
            out: { value: 0, dataType: 'BINARY' },
        },
        variableInputs: {
            min: 2, max: 32, initial: 2
        }
    },

    RS: {
        name: 'RS',
        description: 'Set-Reset flip-flop with dominant reset',
        inputs: {
            R: { value: 0, dataType: 'BINARY' },
            S: { value: 0, dataType: 'BINARY' },
        },
        outputs: {
            out: { value: 0, dataType: 'BINARY' },
        }
    },

    RisingEdge: {
        name: 'Rising edge',
        symbol: '_|‾',
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

    Select: {
        name: 'Select',
        symbol: 'SEL',
        description: 'Select between two values',
        inputs: {
            0: { value: 0, dataType: 'FLOAT' },
            1: { value: 0, dataType: 'FLOAT' },
            sel: { value: 0, dataType: 'BINARY' }
        },
        outputs: {
            out: { value: 0, dataType: 'FLOAT' }
        }
    }
})

class AND extends FunctionBlock
{
    constructor() { super(FunctionDefinitions.AND) }
    protected run = (inputs: number[]) => inputs.reduce((output, input) => output *= input, 1) ? 1 : 0
}

class OR extends FunctionBlock
{
    constructor() { super(FunctionDefinitions.OR) }
    protected run = (inputs: number[]) => inputs.reduce((output, input) => output += input, 0) ? 1 : 0
}

class RS extends FunctionBlock
{
    constructor() { super(FunctionDefinitions.RS) }
    protected run = ([R, S], [out]) => {
        S && (out = 1)
        R && (out = 0)
        return out
    }
}

class RisingEdge extends FunctionBlock
{
    constructor() { super(FunctionDefinitions.RisingEdge) }
    protected statics: typeof FunctionDefinitions.RisingEdge.statics

    protected run = ([input]) => {
        const out = ( !this.statics.prev && input) ? 1 : 0
        this.statics.prev = input
        return out
    }
}

class Select extends FunctionBlock
{
    constructor() { super(FunctionDefinitions.Select) }
    protected run = ([in0, in1, sel]) => sel ? in1 : in0
}

export {
    AND,
    OR,
    RS,
    RisingEdge,
    Select
}
