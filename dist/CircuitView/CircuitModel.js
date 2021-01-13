import { getFunction } from '../FunctionCollection.js';
import { getIOType } from '../Controller/ControllerDataTypes.js';
export class FunctionBlockIO {
    constructor(funcBlock, name, ioNum, flags, value, pinType, isCircuitIO = false) {
        this.funcBlock = funcBlock;
        this.isCircuitIO = isCircuitIO;
        this.onValueChanged = undefined;
        this._name = name;
        this._ioNum = ioNum;
        this._flags = flags;
        this._type = getIOType(flags);
        this._value = value;
        this.initValue = value;
        this.pinType = pinType;
    }
    get name() { return this._name; }
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
        super(funcBlock, name, ioNum, flags, value, 'input', isCircuitIO);
        this._ref = ref;
        this._inverted = !!(flags & 8 /* INVERTED */);
    }
}
export class Output extends FunctionBlockIO {
    constructor(funcBlock, name, ioNum, flags, value, isCircuitIO = false) {
        super(funcBlock, name, ioNum, flags, value, 'output', isCircuitIO);
    }
}
export class FunctionBlock {
    constructor(funcData) {
        this.inputs = [];
        this.outputs = [];
        this.isCircuit = (funcData.library == 0);
        const func = (this.isCircuit) ? null : getFunction(funcData.library, funcData.opcode);
        this.funcData = funcData;
        this.name = (this.isCircuit) ? 'Circuit' : func.name;
        this.setupIO(funcData, func);
    }
    connectOnline(cpu, id) {
        this.id = id;
        this.cpu = cpu;
    }
    setupIO(data, func) {
        for (let inputNum = 0; inputNum < data.inputCount; inputNum++) {
            const ioNum = inputNum;
            const name = (func) ? func.inputs[Math.min(inputNum, func.inputs.length - 1)].name : inputNum.toString();
            this.inputs[inputNum] = new Input(this, name, ioNum, data.ioFlags[ioNum], data.ioValues[ioNum], this.isCircuit);
        }
        for (let outputNum = 0; outputNum < data.outputCount; outputNum++) {
            const ioNum = data.inputCount + outputNum;
            const name = (func) ? func.outputs[Math.min(outputNum, func.inputs.length - 1)].name : outputNum.toString();
            this.outputs[outputNum] = new Output(this, name, ioNum, data.ioFlags[ioNum], data.ioValues[ioNum], this.isCircuit);
        }
    }
    static createNew(library, opcode, customInputCount, customOutputCount) {
        const func = getFunction(library, opcode);
        if (!func) {
            console.error('Invalid function library/opcode');
            return;
        }
        const inputCount = (customInputCount && func.variableInputCount &&
            customInputCount <= func.variableInputCount.max && customInputCount >= func.variableInputCount.min) ? customInputCount : func.inputs.length;
        const outputCount = (customOutputCount && func.variableOutputCount &&
            customOutputCount <= func.variableInputCount.max && customOutputCount >= func.variableOutputCount.min) ? customOutputCount : func.outputs.length;
        function stretchArray(arr, length) {
            while (arr.length < length)
                arr.push(arr[arr.length - 1]);
            while (arr.length > length)
                arr.pop();
            return arr;
        }
        const inputValues = stretchArray(func.inputs.map(input => input.initValue), inputCount);
        const inputFlags = stretchArray(func.inputs.map(input => input.flags), inputCount);
        const outputValues = stretchArray(func.outputs.map(output => output.initValue), outputCount);
        const outputFlags = stretchArray(func.outputs.map(output => output.flags), outputCount);
        const data = {
            library,
            opcode,
            inputCount,
            outputCount,
            staticCount: func.staticCount,
            functionFlags: 0,
            ioValues: [...inputValues, ...outputValues],
            ioFlags: [...inputFlags, ...outputFlags],
            inputRefs: []
        };
        return new FunctionBlock(data);
    }
    static async downloadOnline(cpu, id) {
        const funcData = await cpu.getFunctionBlockData(id);
        const funcBlock = new FunctionBlock(funcData);
        funcBlock.connectOnline(cpu, id);
        return funcBlock;
    }
}
export class Circuit extends FunctionBlock {
    constructor(funcData, circuitData) {
        super(funcData);
        this.blocks = [];
        this.circuitData = circuitData;
    }
    createFunction(library, opcode, customInputCount, customOutputCount, callIndex) {
        const funcBlock = FunctionBlock.createNew(library, opcode, customInputCount, customOutputCount);
        if (!funcBlock)
            return null;
        const id = this.blocks.length;
        this.blocks.push(funcBlock);
        funcBlock.id = id;
        return funcBlock;
    }
    async loadOnlineBlocks() {
        if (!this.cpu) {
            console.error('Circuit: Can not load online blocks. no controller connected');
            return;
        }
        this.blocks = await Promise.all(this.circuitData.callIDList.map(funcID => FunctionBlock.downloadOnline(this.cpu, funcID)));
    }
    static createNew() {
        const funcData = {
            library: 0,
            opcode: 0,
            inputCount: 0,
            outputCount: 0,
            staticCount: 0,
            functionFlags: 0,
            ioValues: [],
            ioFlags: [],
            inputRefs: []
        };
        const circuitData = {
            callIDList: [],
            outputRefs: []
        };
        return new Circuit(funcData, circuitData);
    }
    static async downloadOnline(cpu, circuitID, loadBlocks = true) {
        const funcData = await cpu.getFunctionBlockData(circuitID);
        const circuitData = await cpu.getCircuitData(circuitID);
        const circuit = new Circuit(funcData, circuitData);
        circuit.connectOnline(cpu, circuitID);
        if (loadBlocks)
            circuit.loadOnlineBlocks();
        return circuit;
    }
}
