import { FunctionBlock } from "../FunctionBlock.js";
import { createFunctionCollection } from './CommonLib.js';
export const TimerLibDefinitions = createFunctionCollection({
    DelayOn: {
        name: 'Delay on',
        symbol: 'TON',
        visualStyle: 'name on first row min',
        description: 'Delay set of output signal',
        inputs: [
            { name: 'input', value: 0, datatype: 'BINARY' },
            { name: 't', value: 10, datatype: 'FLOAT' },
            { name: 'res', value: 0, datatype: 'BINARY' }
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'BINARY' },
            { name: '', value: 0, datatype: 'FLOAT' }
        ]
    },
    DelayOff: {
        name: 'Delay off',
        symbol: 'TOFF',
        visualStyle: 'name on first row min',
        description: 'Delay reset of output signal',
        inputs: [
            { name: 'input', value: 1, datatype: 'BINARY' },
            { name: 't', value: 10, datatype: 'FLOAT' },
            { name: 'res', value: 0, datatype: 'BINARY' }
        ],
        outputs: [
            { name: 'out', value: 1, datatype: 'BINARY' },
            { name: '', value: 0, datatype: 'FLOAT' }
        ]
    },
    Pulse: {
        name: 'Pulse',
        symbol: 'Pulse',
        visualStyle: 'name on first row min',
        description: 'Output pulse on input rising edge',
        inputs: [
            { name: 'input', value: 0, datatype: 'BINARY' },
            { name: 't', value: 10, datatype: 'FLOAT' },
            { name: 'res', value: 0, datatype: 'BINARY' }
        ],
        outputs: [
            { name: 'out', value: 0, datatype: 'BINARY' },
            { name: '', value: 0, datatype: 'FLOAT' }
        ],
        staticVariables: {
            prevInput: 0
        }
    }
});
class DelayOn extends FunctionBlock {
    constructor() { super(TimerLibDefinitions.DelayOn); }
    run = ([input, t, res], [out, left], dt) => {
        // Reset output
        if (!input) {
            out = 0;
            left = 0;
        }
        // Reset time
        else if (res) {
            out = input;
            left = 0;
        }
        // Start timer
        else if (input && !out && left == 0) {
            left = t - dt;
        }
        // Time has passed
        else if (input && !out && left < dt) {
            left = 0;
            out = 1;
        }
        // Reduce time left
        else if (input && !out) {
            left -= dt;
        }
        return [out, left];
    };
}
class DelayOff extends FunctionBlock {
    constructor() { super(TimerLibDefinitions.DelayOff); }
    run = ([input, t, res], [out, left], dt) => {
        // Set output
        if (input) {
            out = 1;
            left = 0;
        }
        // Reset time
        else if (res) {
            out = input;
            left = 0;
        }
        // Start timer
        else if (!input && out && left == 0) {
            left = t - dt;
        }
        // Time has passed
        else if (!input && out && left < dt) {
            left = 0;
            out = 0;
        }
        // Reduce time left
        else if (!input && out) {
            left -= dt;
        }
        return [out, left];
    };
}
class Pulse extends FunctionBlock {
    constructor() { super(TimerLibDefinitions.Pulse); }
    run = ([input, t, res], [out, left], dt) => {
        if (res) {
            out = 0;
            left = 0;
        }
        else if (input && !this.staticVariables.prevInput) {
            out = 1;
            left = t - dt;
        }
        else if (left < dt) {
            out = 0;
            left = 0;
        }
        else if (left > 0) {
            left -= dt;
        }
        this.staticVariables.prevInput = input;
        return [out, left];
    };
}
export const timerLib = {
    DelayOn,
    DelayOff,
    Pulse
};
