import { FunctionBlock } from "../FunctionBlock.js";
import { createFunctionCollection } from './CommonLib.js';
export const MathLibDefinitions = createFunctionCollection({
    ADD: {
        name: 'Addition',
        symbol: '+',
        visualStyle: 'symbol',
        description: 'Add float values',
        inputs: [
            { name: '0', value: 0, datatype: 'FLOAT' },
            { name: '1', value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'FLOAT' },
        ],
        variableInputs: {
            min: 2, max: 32, initialCount: 2
        }
    },
    SUB: {
        name: 'Substract',
        symbol: '-',
        visualStyle: 'symbol',
        description: 'Substract float values',
        inputs: [
            { name: '0', value: 0, datatype: 'FLOAT' },
            { name: '1', value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'FLOAT' },
        ],
    },
    MUL: {
        name: 'Multiply',
        symbol: 'x',
        visualStyle: 'symbol',
        description: 'Multiply float values',
        inputs: [
            { name: '0', value: 1, datatype: 'FLOAT' },
            { name: '1', value: 1, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out', value: 1, datatype: 'FLOAT' },
        ],
        variableInputs: {
            min: 2, max: 32, initialCount: 2
        }
    },
    DIV: {
        name: 'Division',
        symbol: '÷',
        visualStyle: 'symbol',
        description: 'Divide float values',
        inputs: [
            { name: '0', value: 0, datatype: 'FLOAT' },
            { name: '1', value: 1, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'FLOAT' },
            { name: 'err', value: 0, datatype: 'BINARY' },
        ],
    },
    Integrate: {
        name: 'Integrate',
        symbol: '∫',
        visualStyle: 'name on first row min',
        description: 'Integrate input value',
        inputs: [
            { name: 'input', value: 0, datatype: 'FLOAT' },
            { name: 'en', value: 1, datatype: 'BINARY' },
            { name: 'res', value: 0, datatype: 'BINARY' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'FLOAT' },
        ],
    },
    Rate: {
        name: 'Rate of change',
        symbol: 'Δ',
        visualStyle: 'symbol',
        description: 'Change rate of input value',
        inputs: [
            { name: 'input', value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'FLOAT' },
        ],
        staticVariables: {
            prev: 0
        }
    },
    LowPassFilter: {
        name: 'Low pass filter',
        symbol: 'PT1',
        visualStyle: 'name on first row min',
        description: 'Single Pole Recursive filter',
        inputs: [
            { name: 'input', value: 0, datatype: 'FLOAT' },
            { name: 'a', value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'FLOAT' },
        ]
    },
});
class ADD extends FunctionBlock {
    constructor() { super(MathLibDefinitions.ADD); }
    run = (inputs) => inputs.reduce((output, input) => output += input, 0);
}
class SUB extends FunctionBlock {
    constructor() { super(MathLibDefinitions.SUB); }
    run = ([a, b]) => a - b;
}
class MUL extends FunctionBlock {
    constructor() { super(MathLibDefinitions.MUL); }
    run = (inputs) => inputs.reduce((output, input) => output *= input, 1);
}
class DIV extends FunctionBlock {
    constructor() { super(MathLibDefinitions.DIV); }
    run = ([a, b]) => (b == 0) ? [0, 1] : [a / b, 0];
}
class Integrate extends FunctionBlock {
    constructor() { super(MathLibDefinitions.Integrate); }
    run = ([input, en, res], [out]) => res ? 0 : en ? out + input : out;
}
class Rate extends FunctionBlock {
    constructor() { super(MathLibDefinitions.Rate); }
    run = ([input]) => {
        const rate = input - this.staticVariables.prev;
        this.staticVariables.prev = input;
        return rate;
    };
}
class LowPassFilter extends FunctionBlock {
    constructor() { super(MathLibDefinitions.LowPassFilter); }
    run = ([input, a], [out]) => out + a * (input - out);
}
export const mathLib = {
    ADD,
    SUB,
    MUL,
    DIV,
    Integrate,
    Rate,
    LowPassFilter
};
