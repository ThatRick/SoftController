import { FunctionBlock, FunctionInstanceDefinition, FunctionTypeDefinition } from "./FunctionBlock.js"

export type BlockVisualStyle =
    | 'full'
    | 'no title'
    | 'no title min'
    | 'name on first row'
    | 'minimum'


function createFunctionCollection <T extends {[name: string]: FunctionTypeDefinition }>(def: T) { return def }

export const FunctionDefinitions = createFunctionCollection(
{
    Circuit: {
        name: 'CIRCUIT',
        description: 'Circuit',
        visualStyle: 'full',
        inputs: {
            0: { value: 0, dataType: 'FLOAT' },
            1: { value: 0, dataType: 'FLOAT' },
            2: { value: 0, dataType: 'FLOAT' },
            3: { value: 0, dataType: 'FLOAT' }
        },
        outputs: {
            0: { value: 0, dataType: 'FLOAT' },
            1: { value: 0, dataType: 'FLOAT' },
        },
        variableInputs : {
            min: 0, max: 32, initialCount: 4
        },
        variableOutputs : {
            min: 0, max: 32, initialCount: 2
        }
    },
    
    AND: {
        name: 'AND',
        symbol: '&',
        visualStyle: 'minimum',
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
        visualStyle: 'minimum',
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
        visualStyle: 'minimum',
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
        visualStyle: 'no title min',
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


export const functionLib =
{
    AND,
    OR,
    RS,
    RisingEdge,
    Select
}

export type FunctionTypeName = keyof typeof functionLib

export const functionTypeNames = Object.keys(functionLib)

export function getFunctionBlock(instance: FunctionInstanceDefinition) {
    const ctor = functionLib[instance.typeName]
    const block = new ctor()
    if (instance.inputs) {
        if (block.typeDef.variableInputs) {
            const instanceInputCount = Math.max(
                // Number of input definitions (for variable input struct types)
                Object.keys(instance.inputs).length,
                // Max input name as number
                Object.keys(instance.inputs).reduce<number>((max, inputName) => Math.max(max, parseInt(inputName)), 0)
            )
            const { initialCount, structSize=1 } = block.typeDef.variableInputs
            const variableTotalCount = initialCount * structSize
            const variableDiff = (instanceInputCount - variableTotalCount) / structSize
            console.assert(variableDiff % 1 == 0, 'variable input count does not fit variable input struct size multiplier')
            const variableCount = initialCount + variableDiff
            block.setVariableInputCount(variableCount)
        }

        Object.entries(instance.inputs).forEach(([inputName, inputDef]) => {
            const input = block.inputs.find(input => input.name == inputName)
            if (!input) console.error('Input instance definition has invalid input name:', inputName)
            else {
                if (inputDef.value != undefined) input.setValue(inputDef.value)
            }
        })
    }
    return block
}

export class CircuitBlock extends FunctionBlock
{
    constructor(definition: FunctionTypeDefinition) { 
        super(definition)
    }
    protected run = (inputs, outputs, dt: number) => {
        this.circuit.update(dt)
        this.updateOutputs()
    }
    protected updateOutputs() {
        this.outputs.forEach(output => {
            if (output.sourcePin) {
                let newValue = output.sourcePin.value
                if (output.inverted) newValue = (newValue) ? 0 : 1
                else if (output.datatype == 'INTEGER') newValue = Math.trunc(newValue)
                output.setValue(newValue)
            }
        })
    }
}