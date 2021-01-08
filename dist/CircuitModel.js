import { getFunction } from './FunctionCollection.js';
import { getIOType } from './SoftTypes.js';
export class FunctionBlockIO {
    constructor(funcBlock, name, ioNum, flags, value, isCircuitIO = false) {
        this.funcBlock = funcBlock;
        this.isCircuitIO = isCircuitIO;
        this.onValueChanged = undefined;
        this._name = name;
        this._ioNum = ioNum;
        this._flags = flags;
        this._type = getIOType(flags);
        this._value = value;
        this.initValue = value;
    }
    get ioNum() { return this._ioNum; }
    get type() { return this._type; }
    get value() { return this._value; }
    get id() { return this.funcBlock.id * 1000 + this._ioNum; }
    set value(value) {
        this._value = value;
        this.onValueChanged?.(this._ioNum, value);
    }
}
export class Input extends FunctionBlockIO {
    constructor(funcBlock, name, ioNum, flags, value, isCircuitIO = false, ref = undefined) {
        super(funcBlock, name, ioNum, flags, value, isCircuitIO);
        this._ref = ref;
        this._inverted = !!(flags & 8 /* INVERTED */);
    }
}
export class Output extends FunctionBlockIO {
    constructor(funcBlock, name, ioNum, flags, value, isCircuitIO = false) {
        super(funcBlock, name, ioNum, flags, value, isCircuitIO);
    }
}
export class FunctionBlock {
    constructor(circuit, library, opcode, numInputs = 0, numOutputs = 0) {
        this.circuit = circuit;
        this.library = library;
        this.opcode = opcode;
        this.inputs = [];
        this.outputs = [];
        if (library) {
            this.func = getFunction(library, opcode);
            this.name = this.func.name;
            this.defineFunctionTypeIO(this.func, numInputs, numOutputs);
        }
        else {
            this.name = 'Circuit';
            this.defineCircuitIO(numInputs, numOutputs);
        }
    }
    defineCircuitIO(numInputs, numOutputs) {
        let ioNum = 0;
        for (let inputNum = 0; inputNum < numInputs; inputNum++) {
            this.inputs[inputNum] = new Input(this, inputNum.toString(), ioNum++, 0, 0, true);
        }
        for (let outputNum = 0; outputNum < numOutputs; outputNum++) {
            this.outputs[outputNum] = new Output(this, outputNum.toString(), ioNum++, 0, 0, true);
        }
    }
    defineFunctionTypeIO(func, numInputs, numOutputs) {
        numInputs = (numInputs && func.variableInputCount &&
            numInputs <= func.variableInputCount.max && numInputs >= func.variableInputCount.min) ? numInputs : func.inputs.length;
        numOutputs = (numOutputs && func.variableInputCount &&
            numOutputs <= func.variableInputCount.max && numOutputs >= func.variableInputCount.min) ? numOutputs : func.outputs.length;
        let ioNum = 0;
        for (let inputNum = 0; inputNum < numInputs; inputNum++) {
            const input = func.inputs[Math.min(inputNum, func.inputs.length - 1)];
            this.inputs[inputNum] = new Input(this, input.name, ioNum++, input.flags, input.initValue);
        }
        for (let outputNum = 0; outputNum < numOutputs; outputNum++) {
            const output = func.outputs[Math.min(outputNum, func.outputs.length - 1)];
            this.outputs[outputNum] = new Output(this, output.name, ioNum++, output.flags, output.initValue);
        }
    }
}
export class Circuit extends FunctionBlock {
    constructor() {
        super(...arguments);
        this.blocks = new Map();
    }
}
