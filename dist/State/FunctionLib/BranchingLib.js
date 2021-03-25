import { FunctionBlock } from "../FunctionBlock.js";
import { createFunctionCollection } from './CommonLib.js';
export const BranchingLibDefinitions = createFunctionCollection({
    Select: {
        name: 'Select',
        symbol: 'SEL',
        visualStyle: 'name on first row min',
        description: 'Select between two values',
        inputs: {
            sel: { value: 0, dataType: 'BINARY' },
            '1 ': { value: 0, dataType: 'FLOAT' },
            '0 ': { value: 0, dataType: 'FLOAT' },
        },
        outputs: {
            out: { value: 0, dataType: 'FLOAT' }
        }
    }
});
class Select extends FunctionBlock {
    constructor() {
        super(BranchingLibDefinitions.Select);
        this.run = ([sel, in1, in0]) => sel ? in1 : in0;
    }
}
export const branchingLib = {
    Select
};
