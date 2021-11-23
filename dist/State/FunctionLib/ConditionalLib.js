import { FunctionBlock } from "../FunctionBlock.js";
import { createFunctionCollection } from './CommonLib.js';
export const ConditionalLibDefinitions = createFunctionCollection({
    Select: {
        name: 'Select',
        symbol: 'SEL',
        visualStyle: 'no title min',
        description: 'Select between two values',
        inputs: [
            { name: '0', value: 0, datatype: 'FLOAT' },
            { name: '1', value: 0, datatype: 'FLOAT' },
            { name: 'sel', value: 0, datatype: 'BINARY' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'FLOAT' }
        ]
    },
    Mux: {
        name: 'Multiplexer',
        symbol: 'MUX',
        visualStyle: 'name on first row min',
        description: 'Select output value based on index',
        inputs: [
            { name: 'index', value: 0, datatype: 'INTEGER' },
            { name: '0', value: 0, datatype: 'FLOAT' },
            { name: '1', value: 1, datatype: 'FLOAT' },
            { name: '2', value: 2, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'FLOAT' }
        ],
        variableInputs: {
            min: 2, max: 32, initialCount: 3
        }
    },
    MuxBool: {
        name: 'Mux bool',
        symbol: 'MUXB',
        visualStyle: 'no title',
        description: 'Select output value based on boolean selectors',
        inputs: [
            { name: '0', value: 2, datatype: 'FLOAT' },
            { name: 's0', value: 0, datatype: 'BINARY' },
            { name: '1', value: 4, datatype: 'FLOAT' },
            { name: 's1', value: 0, datatype: 'BINARY' },
            { name: '2', value: 8, datatype: 'FLOAT' },
            { name: 's2', value: 0, datatype: 'BINARY' },
        ],
        outputs: [
            { name: 'mux', value: 0, datatype: 'FLOAT' },
            { name: 'en', value: 0, datatype: 'BINARY' }
        ],
        variableInputs: {
            min: 2, max: 32, initialCount: 3, structSize: 2
        }
    },
    Compare: {
        name: 'Compare',
        symbol: 'CMP',
        visualStyle: 'no title',
        description: 'Compare two values',
        inputs: [
            { name: 'a', value: 0, datatype: 'FLOAT' },
            { name: 'b', value: 0, datatype: 'FLOAT' },
            { name: 'tol', value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: '>', value: 0, datatype: 'BINARY' },
            { name: '=', value: 1, datatype: 'BINARY' },
            { name: '<', value: 0, datatype: 'BINARY' },
        ]
    },
    Greater: {
        name: 'Greater',
        symbol: '>',
        visualStyle: 'symbol',
        description: 'Greater than value',
        inputs: [
            { name: 'A', value: 0, datatype: 'FLOAT' },
            { name: 'B', value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'BINARY' },
        ]
    },
    Less: {
        name: 'Less',
        symbol: '<',
        visualStyle: 'symbol',
        description: 'Less than value',
        inputs: [
            { name: 'A', value: 0, datatype: 'FLOAT' },
            { name: 'B', value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'BINARY' },
        ]
    },
    Equal: {
        name: 'Equal',
        symbol: '=',
        visualStyle: 'symbol',
        description: 'Equal to value',
        inputs: [
            { name: 'A', value: 0, datatype: 'FLOAT' },
            { name: 'B', value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'BINARY' },
        ]
    },
    Limit: {
        name: 'Limit',
        symbol: 'LIM',
        visualStyle: 'name on first row min',
        description: 'Limit value',
        inputs: [
            { name: 'input', value: 0, datatype: 'FLOAT' },
            { name: 'H', value: 0, datatype: 'FLOAT' },
            { name: 'L', value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'FLOAT' },
            { name: '', value: 0, datatype: 'BINARY' },
            { name: '', value: 0, datatype: 'BINARY' },
        ]
    },
    Move: {
        name: 'Move',
        symbol: 'MOV',
        visualStyle: 'name on first row min',
        description: 'Copy input to output if condition is true',
        inputs: [
            { name: 'input', value: 0, datatype: 'FLOAT' },
            { name: 'cnd', value: 0, datatype: 'BINARY' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'FLOAT' },
        ]
    },
    Pass: {
        name: 'Pass',
        symbol: '▷',
        visualStyle: 'symbol',
        description: 'Pass value through',
        inputs: [
            { name: 'input', value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'FLOAT' },
        ]
    },
});
class Select extends FunctionBlock {
    constructor() { super(ConditionalLibDefinitions.Select); }
    run = ([in0, in1, sel]) => sel ? in1 : in0;
}
class Mux extends FunctionBlock {
    constructor() { super(ConditionalLibDefinitions.Mux); }
    run = ([index, ...values], [output]) => (index >= 0 && index < values.length) ? values[Math.trunc(index)] : output;
}
class MuxBool extends FunctionBlock {
    constructor() { super(ConditionalLibDefinitions.MuxBool); }
    run = (inputs, [out]) => {
        for (let i = -2; i >= -inputs.length; i -= 2) {
            const [value, sel] = inputs.slice(i);
            if (sel)
                return [value, 1];
        }
        return [out, 0];
    };
}
class Compare extends FunctionBlock {
    constructor() { super(ConditionalLibDefinitions.Compare); }
    run = ([a, b, hys]) => [+(a > b + hys), +(Math.abs(a - b) <= hys), +(a < b - hys)];
}
class Greater extends FunctionBlock {
    constructor() { super(ConditionalLibDefinitions.Greater); }
    run = ([A, B]) => [+(A > B)];
}
class Less extends FunctionBlock {
    constructor() { super(ConditionalLibDefinitions.Less); }
    run = ([A, B]) => [+(A < B)];
}
class Equal extends FunctionBlock {
    constructor() { super(ConditionalLibDefinitions.Equal); }
    run = ([A, B]) => [+(A == B)];
}
class Limit extends FunctionBlock {
    constructor() { super(ConditionalLibDefinitions.Limit); }
    run = ([input, H, L]) => [Math.max(L, Math.min(H, input)), +(input >= H), +(input <= L)];
}
class Move extends FunctionBlock {
    constructor() { super(ConditionalLibDefinitions.Move); }
    run = ([input, cnd]) => cnd ? input : null;
}
class Pass extends FunctionBlock {
    constructor() { super(ConditionalLibDefinitions.Pass); }
    run = ([input]) => input;
}
export const conditionalLib = {
    Select,
    Mux,
    MuxBool,
    Compare,
    Greater,
    Less,
    Equal,
    Limit,
    Move,
    Pass
};
