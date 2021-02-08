const PT1 = {
    name: 'PT1',
    inputs: [
        { name: 'in', initValue: 0, flags: 0 /* FLOAT */ },
        { name: 'G', initValue: 1, flags: 0 /* FLOAT */ },
        { name: 'T1', initValue: 10, flags: 0 /* FLOAT */ }
    ],
    outputs: [
        { initValue: 0, flags: 0 /* FLOAT */ }
    ],
    run(params, values) {
        const input = values[params.input + 0];
        const G = values[params.input + 1];
        const T1 = values[params.input + 2];
        const Y = values[params.output];
        const out = (G * input + T1 / params.dt * Y) / (1 + T1 / params.dt);
        values[params.output] = out;
    }
};
export const Filters = {
    id: 3,
    name: 'Filters',
    functions: [
        PT1,
    ]
};
