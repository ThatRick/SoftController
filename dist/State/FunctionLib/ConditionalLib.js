import { FunctionBlock } from "../FunctionBlock.js";
import { createFunctionCollection } from './CommonLib.js';
export const ConditionalLibDefinitions = createFunctionCollection({
    Select: {
        name: 'Select',
        symbol: 'SEL',
        visualStyle: 'name on first row min',
        description: 'Select between two values',
        inputs: [
            { name: 'sel', value: 0, datatype: 'BINARY' },
            { name: '0', value: 0, datatype: 'FLOAT' },
            { name: '1', value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'FLOAT' }
        ]
    },
    Mux: {
        name: 'Multiplexer',
        symbol: 'MUX',
        visualStyle: 'name on first row min',
        description: 'Select input based on index',
        inputs: [
            { name: 'index', value: 0, datatype: 'INTEGER' },
            { name: '0', value: 0, datatype: 'FLOAT' },
            { name: '1', value: 0, datatype: 'FLOAT' },
            { name: '2', value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'FLOAT' }
        ]
    }
});
class Select extends FunctionBlock {
    constructor() { super(ConditionalLibDefinitions.Select); }
    run = ([sel, in1, in0]) => sel ? in1 : in0;
}
class Mux extends FunctionBlock {
    constructor() { super(ConditionalLibDefinitions.Mux); }
    run = ([index, ...values], [output]) => (index >= 0 && index < values.length) ? values[Math.trunc(index)] : output;
}
export const conditionalLib = {
    Select,
    Mux
};
