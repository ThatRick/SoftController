import { FunctionBlock } from "../FunctionBlock.js";
import { createFunctionCollection } from './CommonLib.js';
export const BranchingLibDefinitions = createFunctionCollection({
    Select: {
        name: 'Select',
        symbol: 'SEL',
        visualStyle: 'no title min',
        description: 'Select between two values',
        inputs: {
            0: { value: 0, dataType: 'FLOAT' },
            1: { value: 0, dataType: 'FLOAT' },
            sel: { value: 0, dataType: 'BINARY' }
        },
        outputs: {
            out: { value: 0, dataType: 'FLOAT' }
        }
    }
});
class Select extends FunctionBlock {
    constructor() {
        super(BranchingLibDefinitions.Select);
        this.run = ([in0, in1, sel]) => sel ? in1 : in0;
    }
}
export const branchingLib = {
    Select
};
