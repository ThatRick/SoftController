const AND = {
    inputs: [
        { initValue: 1, flags: 2 /* BOOLEAN */ },
        { initValue: 1, flags: 2 /* BOOLEAN */ }
    ],
    outputs: [
        { initValue: 1, flags: 2 /* BOOLEAN */ }
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
    inputs: [
        { initValue: 0, flags: 2 /* BOOLEAN */ },
        { initValue: 0, flags: 2 /* BOOLEAN */ }
    ],
    outputs: [
        { initValue: 0, flags: 2 /* BOOLEAN */ }
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
    inputs: [
        { initValue: 0, flags: 2 /* BOOLEAN */ },
        { initValue: 0, flags: 2 /* BOOLEAN */ }
    ],
    outputs: [
        { initValue: 0, flags: 2 /* BOOLEAN */ }
    ],
    run(params, values) {
        const [a, b] = values;
        values[params.output] = ((a && !b) || (a && b)) ? 1 : 0;
    }
};
const NOT = {
    inputs: [
        { initValue: 0, flags: 2 /* BOOLEAN */ }
    ],
    outputs: [
        { initValue: 1, flags: 2 /* BOOLEAN */ }
    ],
    run(params, values) {
        values[params.output] = values[params.input] ? 0 : 1;
    }
};
const EDGE_UP = {
    inputs: [
        { initValue: 0, flags: 2 /* BOOLEAN */ }
    ],
    outputs: [
        { initValue: 0, flags: 2 /* BOOLEAN */ }
    ],
    staticCount: 1,
    run(params, values) {
        values[params.output] = values[params.input] && !values[params.static] ? 1 : 0;
        values[params.static] = values[params.input];
    }
};
const EDGE_DOWN = {
    inputs: [
        { initValue: 0, flags: 2 /* BOOLEAN */ }
    ],
    outputs: [
        { initValue: 0, flags: 2 /* BOOLEAN */ }
    ],
    staticCount: 1,
    run(params, values) {
        values[params.output] = !values[params.input] && values[params.static] ? 1 : 0;
        values[params.static] = values[params.input];
    }
};
const RS = {
    inputs: [
        { name: 'R', initValue: 0, flags: 2 /* BOOLEAN */ },
        { name: 'S', initValue: 0, flags: 2 /* BOOLEAN */ }
    ],
    outputs: [
        { initValue: 0, flags: 2 /* BOOLEAN */ }
    ],
    staticCount: 1,
    run(params, values) {
        const [R, S] = values.slice(params.input);
        let out = values[params.static];
        if (R)
            out = 0;
        else if (S)
            out = 1;
        values[params.output] = out;
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
        RS
    }
};
