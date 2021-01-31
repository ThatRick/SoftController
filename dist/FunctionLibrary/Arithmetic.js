const ADD = {
    name: '+',
    inputs: [
        { initValue: 0, flags: 0 /* FLOAT */ },
        { initValue: 0, flags: 0 /* FLOAT */ }
    ],
    outputs: [
        { initValue: 0, flags: 0 /* FLOAT */ }
    ],
    variableInputCount: { min: 2, max: 64 },
    run(params, values) {
        let out = 0;
        for (let i = 0; i < params.inputCount; i++) {
            out += values[params.input + i];
        }
        values[params.output] = out;
    }
};
const SUB = {
    name: '-',
    inputs: [
        { initValue: 0, flags: 0 /* FLOAT */ },
        { initValue: 0, flags: 0 /* FLOAT */ }
    ],
    outputs: [
        { initValue: 0, flags: 0 /* FLOAT */ }
    ],
    run(params, values) {
        const a = values[params.input + 0];
        const b = values[params.input + 1];
        values[params.output] = a - b;
    }
};
const MUL = {
    name: 'x',
    inputs: [
        { initValue: 1, flags: 0 /* FLOAT */ },
        { initValue: 1, flags: 0 /* FLOAT */ }
    ],
    outputs: [
        { initValue: 1, flags: 0 /* FLOAT */ }
    ],
    variableInputCount: { min: 2, max: 64 },
    run(params, values) {
        let out = 1;
        for (let i = 0; i < params.inputCount; i++) {
            out *= values[params.input + i];
        }
        values[params.output] = out;
    }
};
const DIV = {
    name: '/',
    inputs: [
        { initValue: 1, flags: 0 /* FLOAT */ },
        { initValue: 1, flags: 0 /* FLOAT */ }
    ],
    outputs: [
        { initValue: 1, flags: 0 /* FLOAT */ },
        { name: 'e', initValue: 0, flags: 2 /* BINARY */ }
    ],
    run(params, values) {
        const a = values[params.input + 0];
        const b = values[params.input + 1];
        if (b == 0) {
            values[params.output] = 0;
            values[params.output + 1] = 1;
        }
        else {
            values[params.output] = a / b;
            values[params.output + 1] = 0;
        }
    }
};
export const Arithmetic = {
    id: 2,
    name: 'Math',
    functions: [
        ADD,
        SUB,
        MUL,
        DIV //    3
    ]
};
