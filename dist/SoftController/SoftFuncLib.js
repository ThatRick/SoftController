const AND = {
    name: 'AND',
    inputs: [
        { initValue: 1, flags: 2 /* BOOL */ },
        { initValue: 1, flags: 2 /* BOOL */ }
    ],
    outputs: [
        { initValue: 1, flags: 2 /* BOOL */ }
    ],
    variableInputCount: { min: 2, max: 64 },
    run(params, values) {
        let out = 1;
        for (let i = 0; i < params.inputCount; i++) {
            out *= values[params.input + i];
        }
        values[params.output] = out ? 1 : 0;
    }
};
const OR = {
    name: 'OR',
    inputs: [
        { initValue: 0, flags: 2 /* BOOL */ },
        { initValue: 0, flags: 2 /* BOOL */ }
    ],
    outputs: [
        { initValue: 0, flags: 2 /* BOOL */ }
    ],
    variableInputCount: { min: 2, max: 64 },
    run(params, values) {
        let out = 0;
        for (let i = 0; i < params.inputCount; i++) {
            out += values[params.input + i];
        }
        values[params.output] = out ? 1 : 0;
    }
};
const XOR = {
    name: 'XOR',
    inputs: [
        { initValue: 0, flags: 2 /* BOOL */ },
        { initValue: 0, flags: 2 /* BOOL */ }
    ],
    outputs: [
        { initValue: 0, flags: 2 /* BOOL */ }
    ],
    run(params, values) {
        const a = values[params.input + 0];
        const b = values[params.input + 1];
        values[params.output] = ((a && !b) || (a && b)) ? 1 : 0;
    }
};
const NOT = {
    name: 'NOT',
    inputs: [
        { initValue: 0, flags: 2 /* BOOL */ }
    ],
    outputs: [
        { initValue: 1, flags: 2 /* BOOL */ }
    ],
    run(params, values) {
        values[params.output] = values[params.input] ? 0 : 1;
    }
};
const EDGE_UP = {
    name: '_|‾',
    inputs: [
        { initValue: 0, flags: 2 /* BOOL */ }
    ],
    outputs: [
        { initValue: 0, flags: 2 /* BOOL */ }
    ],
    staticCount: 1,
    run(params, values) {
        values[params.output] = values[params.input] && !values[params.static] ? 1 : 0;
        values[params.static] = values[params.input];
    }
};
const EDGE_DOWN = {
    name: '‾|_',
    inputs: [
        { initValue: 0, flags: 2 /* BOOL */ }
    ],
    outputs: [
        { initValue: 0, flags: 2 /* BOOL */ }
    ],
    staticCount: 1,
    run(params, values) {
        values[params.output] = !values[params.input] && values[params.static] ? 1 : 0;
        values[params.static] = values[params.input];
    }
};
const RS = {
    name: 'RS',
    inputs: [
        { name: 'R', initValue: 0, flags: 2 /* BOOL */ },
        { name: 'S', initValue: 0, flags: 2 /* BOOL */ }
    ],
    outputs: [
        { initValue: 0, flags: 2 /* BOOL */ }
    ],
    staticCount: 1,
    run(params, values) {
        const R = values[params.input + 0];
        const S = values[params.input + 1];
        if (R)
            values[params.output] = 0;
        else if (S)
            values[params.output] = 1;
    }
};
export const LogicLib = {
    name: 'Boolean Logic',
    functions: {
        AND,
        OR,
        XOR,
        NOT,
        EDGE_UP,
        EDGE_DOWN,
        RS //      6
    },
    getFunction(opcode) {
        return Object.values(this.functions)[opcode];
    },
    getFunctionName(opcode) {
        return Object.keys(this.functions)[opcode];
    }
};
