import { FunctionBlock } from "../FunctionBlock.js"
import { createFunctionCollection } from './CommonLib.js'

export const ConditionalLibDefinitions = createFunctionCollection(
{
    Select: {
        name: 'Select',
        symbol: 'SEL',
        visualStyle: 'name on first row min',
        description: 'Select between two values',
        inputs: [
            { name: 'sel',  value: 0, datatype: 'BINARY' },
            { name: '1',    value: 0, datatype: 'FLOAT' },
            { name: '0',    value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out',  value: 0, datatype: 'FLOAT' }
        ]
    },
    Mux: {
        name: 'Multiplexer',
        symbol: 'MUX',
        visualStyle: 'name on first row min',
        description: 'Select input based on index',
        inputs: [
            { name: 'index', value: 0, datatype: 'INTEGER' },
            { name: '0',     value: 0, datatype: 'FLOAT' },
            { name: '1',     value: 0, datatype: 'FLOAT' },
            { name: '2',     value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out',   value: 0, datatype: 'FLOAT' }
        ],
        variableInputs: {
            min: 2, max: 32, initialCount: 3
        }
    },
    Compare: {
        name: 'Compare',
        symbol: 'CMP',
        visualStyle: 'no title min',
        description: 'Compare two values',
        inputs: [
            { name: 'A', value: 0, datatype: 'FLOAT' },
            { name: 'B', value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: '>',  value: 0, datatype: 'BINARY' },
            { name: '=',  value: 0, datatype: 'BINARY' },
            { name: '<',  value: 0, datatype: 'BINARY' },
        ]
    },
    Greater: {
        name: 'Greater',
        symbol: '>',
        visualStyle: 'minimal',
        description: 'Greater than value',
        inputs: [
            { name: 'A', value: 0, datatype: 'FLOAT' },
            { name: 'B', value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out',  value: 0, datatype: 'BINARY' },
        ]
    },
    Less: {
        name: 'Less',
        symbol: '<',
        visualStyle: 'minimal',
        description: 'Less than value',
        inputs: [
            { name: 'A', value: 0, datatype: 'FLOAT' },
            { name: 'B', value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out',  value: 0, datatype: 'BINARY' },
        ]
    },
    Equal: {
        name: 'Equal',
        symbol: '=',
        visualStyle: 'minimal',
        description: 'Equal to value',
        inputs: [
            { name: 'A', value: 0, datatype: 'FLOAT' },
            { name: 'B', value: 0, datatype: 'FLOAT' },
        ],
        outputs: [
            { name: 'out',  value: 0, datatype: 'BINARY' },
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
            { name: 'out',  value: 0, datatype: 'FLOAT' },
            { name: '',  value: 0, datatype: 'BINARY' },
            { name: '',  value: 0, datatype: 'BINARY' },
        ]
    },
})


class Select extends FunctionBlock
{
    constructor() { super(ConditionalLibDefinitions.Select) }
    protected run = ([sel, in1, in0]) => sel ? in1 : in0
}
class Mux extends FunctionBlock
{
    constructor() { super(ConditionalLibDefinitions.Mux) }
    protected run = ([index, ...values], [output]) => (index >= 0 && index < values.length) ? values[Math.trunc(index)] : output
}
class Compare extends FunctionBlock
{
    constructor() { super(ConditionalLibDefinitions.Compare) }
    protected run = ([A, B]) => [+(A > B), +(A == B), +(A < B)]
}
class Greater extends FunctionBlock
{
    constructor() { super(ConditionalLibDefinitions.Greater) }
    protected run = ([A, B]) => [+(A > B)]
}
class Less extends FunctionBlock
{
    constructor() { super(ConditionalLibDefinitions.Less) }
    protected run = ([A, B]) => [+(A < B)]
}
class Equal extends FunctionBlock
{
    constructor() { super(ConditionalLibDefinitions.Equal) }
    protected run = ([A, B]) => [+(A == B)]
}
class Limit extends FunctionBlock
{
    constructor() { super(ConditionalLibDefinitions.Limit) }
    protected run = ([input, H, L]) => [Math.max(L, Math.min(H, input)), +(input >= H), +(input <= L)]
}

export const conditionalLib =
{
    Select,
    Mux,
    Compare,
    Greater,
    Less,
    Equal,
    Limit
}