import { FunctionBlock } from "./FunctionBlock.js";
import Circuit from "./Circuit.js";
import { logicLib } from './FunctionLib/LogicLib.js';
import { mathLib } from './FunctionLib/MathLib.js';
import { conditionalLib } from './FunctionLib/ConditionalLib.js';
import { timerLib } from './FunctionLib/TimerLib.js';
export const functionLib = {
    ...logicLib,
    ...mathLib,
    ...conditionalLib,
    ...timerLib
};
export const functionTypeNames = Object.keys(functionLib);
export function getFunctionBlock(instance) {
    const ctor = functionLib[instance.typeName];
    console.assert(ctor != null, 'Function block not found:', instance);
    const block = new ctor();
    block.setTypeName(instance.typeName);
    if (instance.inputs) {
        if (block.typeDef.variableInputs) {
            const instanceInputCount = Math.max(
            // Number of input definitions (for variable input struct types)
            Object.keys(instance.inputs).length, 
            // Max input name as number
            Object.keys(instance.inputs).reduce((max, inputName) => Math.max(max, parseInt(inputName)), 0));
            const { initialCount, structSize = 1 } = block.typeDef.variableInputs;
            const variableTotalCount = initialCount * structSize;
            const variableDiff = (instanceInputCount - variableTotalCount) / structSize;
            console.assert(variableDiff % 1 == 0, 'variable input count does not fit variable input struct size multiplier');
            const variableCount = initialCount + variableDiff;
            block.setVariableInputCount(variableCount);
        }
        Object.entries(instance.inputs).forEach(([inputName, inputDef]) => {
            const input = block.inputs.find(input => input.name == inputName);
            if (!input)
                console.error('Input instance definition has invalid input name:', inputName);
            else {
                if (inputDef.value != undefined)
                    input.setValue(inputDef.value);
            }
        });
    }
    if (instance.outputs) {
        Object.entries(instance.outputs).forEach(([outputName, outputDef]) => {
            const output = block.outputs.find(output => output.name == outputName);
            if (!output)
                console.error('Output instance definition has invalid output name:', outputName);
            else {
                if (outputDef.value != undefined)
                    output.setValue(outputDef.value);
            }
        });
    }
    return block;
}
export class CircuitBlock extends FunctionBlock {
    circuit;
    constructor(blockDef, circuitDef) {
        super(blockDef);
        this.circuit = new Circuit(circuitDef, this);
    }
    remove() {
        super.remove();
        this.circuit.remove();
    }
    run = (inputs, outputs, dt) => {
        this.circuit.update(dt);
        this.updateOutputs();
    };
    updateOutputs() {
        this.outputs.forEach(output => {
            if (output.sourceIO) {
                let newValue = output.sourceIO.value;
                if (output.inverted)
                    newValue = (newValue) ? 0 : 1;
                else if (output.datatype == 'INTEGER')
                    newValue = Math.trunc(newValue);
                output.setValue(newValue);
            }
        });
    }
}
