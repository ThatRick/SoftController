import { FunctionBlock } from "../FunctionBlock.js";
import { createFunctionCollection } from './CommonLib.js';
export const MathLibDefinitions = createFunctionCollection({
    ADD: {
        name: 'Addition',
        symbol: '+',
        visualStyle: 'minimal',
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
        visualStyle: 'minimal',
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
        visualStyle: 'minimal',
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
        visualStyle: 'minimal',
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
export const mathLib = {
    ADD,
    SUB,
    MUL,
    DIV
};
