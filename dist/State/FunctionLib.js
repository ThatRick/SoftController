import { FunctionBlock } from "./FunctionBlock.js";
function createFunctionCollection(def) { return def; }
export const FunctionDefinitions = createFunctionCollection({
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
        variableInputs: {
            min: 0, max: 32, initialCount: 4
        },
        variableOutputs: {
            min: 0, max: 32, initialCount: 2
        }
    },
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
});
class AND extends FunctionBlock {
    constructor() {
        super(FunctionDefinitions.AND);
        this.run = (inputs) => inputs.reduce((output, input) => output *= input, 1) ? 1 : 0;
    }
}
class OR extends FunctionBlock {
    constructor() {
        super(FunctionDefinitions.OR);
        this.run = (inputs) => inputs.reduce((output, input) => output += input, 0) ? 1 : 0;
    }
}
class RS extends FunctionBlock {
    constructor() {
        super(FunctionDefinitions.RS);
        this.run = ([R, S], [out]) => {
            S && (out = 1);
            R && (out = 0);
            return out;
        };
    }
}
class RisingEdge extends FunctionBlock {
    constructor() {
        super(FunctionDefinitions.RisingEdge);
        this.run = ([input]) => {
            const out = (!this.statics.prev && input) ? 1 : 0;
            this.statics.prev = input;
            return out;
        };
    }
}
class Select extends FunctionBlock {
    constructor() {
        super(FunctionDefinitions.Select);
        this.run = ([in0, in1, sel]) => sel ? in1 : in0;
    }
}
export const functionLib = {
    AND,
    OR,
    RS,
    RisingEdge,
    Select
};
export const functionTypeNames = Object.keys(functionLib);
export function getFunctionBlock(instance) {
    const ctor = functionLib[instance.typeName];
    console.assert(ctor != null, 'Function block not found:', instance);
    const block = new ctor();
    block.setTypeName(instance.typeName);
    if (instance.inputs) {
        if (block.typeDef.variableInputs) {
            const instanceInputCount = Math.max(
            // Number of input definitions (for variable input struct types)
            Object.keys(instance.inputs).length, 
            // Max input name as number
            Object.keys(instance.inputs).reduce((max, inputName) => Math.max(max, parseInt(inputName)), 0));
            const { initialCount, structSize = 1 } = block.typeDef.variableInputs;
            const variableTotalCount = initialCount * structSize;
            const variableDiff = (instanceInputCount - variableTotalCount) / structSize;
            console.assert(variableDiff % 1 == 0, 'variable input count does not fit variable input struct size multiplier');
            const variableCount = initialCount + variableDiff;
            block.setVariableInputCount(variableCount);
        }
        Object.entries(instance.inputs).forEach(([inputName, inputDef]) => {
            const input = block.inputs.find(input => input.name == inputName);
            if (!input)
                console.error('Input instance definition has invalid input name:', inputName);
            else {
                if (inputDef.value != undefined)
                    input.setValue(inputDef.value);
            }
        });
    }
    return block;
}
export class CircuitBlock extends FunctionBlock {
    constructor(definition) {
        super(definition);
        this.run = (inputs, outputs, dt) => {
            this.circuit.update(dt);
            this.updateOutputs();
        };
    }
    updateOutputs() {
        this.outputs.forEach(output => {
            if (output.sourceIO) {
                let newValue = output.sourceIO.value;
                if (output.inverted)
                    newValue = (newValue) ? 0 : 1;
                else if (output.datatype == 'INTEGER')
                    newValue = Math.trunc(newValue);
                output.setValue(newValue);
            }
        });
    }
}
