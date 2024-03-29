import { FunctionBlock } from "../FunctionBlock.js";
import { createFunctionCollection } from './CommonLib.js';
export const LogicLibDefinitions = createFunctionCollection({
    AND: {
        name: 'AND',
        symbol: '&',
        visualStyle: 'symbol',
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
        visualStyle: 'symbol',
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
        visualStyle: 'symbol',
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
    FallingEdge: {
        name: 'Falling edge',
        symbol: '‾|_',
        visualStyle: 'symbol',
        description: 'Falling signal edge detector (1 -> 0)',
        inputs: [
            { name: 'input', value: 1, datatype: 'BINARY' }
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'BINARY' }
        ],
        staticVariables: {
            prev: 1
        }
    },
});
class AND extends FunctionBlock {
    constructor() { super(LogicLibDefinitions.AND); }
    run = (inputs) => inputs.reduce((output, input) => output *= input, 1) ? 1 : 0;
}
class OR extends FunctionBlock {
    constructor() { super(LogicLibDefinitions.OR); }
    run = (inputs) => inputs.reduce((output, input) => output += input, 0) ? 1 : 0;
}
class RS extends FunctionBlock {
    constructor() { super(LogicLibDefinitions.RS); }
    run = ([S, R], [out]) => {
        S && (out = 1);
        R && (out = 0);
        return out;
    };
}
class RisingEdge extends FunctionBlock {
    constructor() { super(LogicLibDefinitions.RisingEdge); }
    run = ([input]) => {
        const out = (!this.staticVariables.prev && input) ? 1 : 0;
        this.staticVariables.prev = input;
        return out;
    };
}
class FallingEdge extends FunctionBlock {
    constructor() { super(LogicLibDefinitions.FallingEdge); }
    run = ([input]) => {
        const out = (this.staticVariables.prev && !input) ? 1 : 0;
        this.staticVariables.prev = input;
        return out;
    };
}
export const logicLib = {
    AND,
    OR,
    RS,
    RisingEdge,
    FallingEdge,
};
