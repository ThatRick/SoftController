import { FunctionBlock } from "../FunctionBlock.js";
import { createFunctionCollection } from './CommonLib.js';
export const TimerLibDefinitions = createFunctionCollection({
    DelayOn: {
        name: 'Delay on',
        symbol: 'TON',
        visualStyle: 'name on first row',
        description: 'Delay set of output signal',
        inputs: {
            input: { value: 0, dataType: 'BINARY' },
            t: { value: 10, dataType: 'FLOAT' },
            res: { value: 0, dataType: 'BINARY' }
        },
        outputs: {
            out: { value: 0, dataType: 'BINARY' },
            left: { value: 0, dataType: 'FLOAT' }
        }
    },
    DelayOff: {
        name: 'Delay off',
        symbol: 'TOFF',
        visualStyle: 'name on first row',
        description: 'Delay reset of output signal',
        inputs: {
            input: { value: 1, dataType: 'BINARY' },
            t: { value: 10, dataType: 'FLOAT' },
            res: { value: 0, dataType: 'BINARY' }
        },
        outputs: {
            out: { value: 1, dataType: 'BINARY' },
            left: { value: 0, dataType: 'FLOAT' }
        }
    },
    Pulse: {
        name: 'Pulse',
        symbol: 'Pulse',
        visualStyle: 'name on first row',
        description: 'Output pulse on input rising edge',
        inputs: {
            input: { value: 1, dataType: 'BINARY' },
            t: { value: 10, dataType: 'FLOAT' },
            res: { value: 0, dataType: 'BINARY' }
        },
        outputs: {
            out: { value: 1, dataType: 'BINARY' },
            left: { value: 0, dataType: 'FLOAT' }
        },
        statics: {
            prevInput: 0
        }
    }
});
class DelayOn extends FunctionBlock {
    constructor() {
        super(TimerLibDefinitions.DelayOn);
        this.run = ([input, t, res], [out, left], dt) => {
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
}
class DelayOff extends FunctionBlock {
    constructor() {
        super(TimerLibDefinitions.DelayOff);
        this.run = ([input, t, res], [out, left], dt) => {
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
}
class Pulse extends FunctionBlock {
    constructor() {
        super(TimerLibDefinitions.Pulse);
        this.run = ([input, t, res], [out, left], dt) => {
            if (res) {
                out = 0;
                left = 0;
            }
            else if (input && !this.statics.prevInput) {
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
            this.statics.prevInput = input;
            return [out, left];
        };
    }
}
export const timerLib = {
    DelayOn,
    DelayOff,
    Pulse
};
