class IO {
    constructor(funcBlock, name, ioNum, type, value, isCircuitIO = false) {
        this.funcBlock = funcBlock;
        this.isCircuitIO = isCircuitIO;
        this.onValueChanged = undefined;
        this._name = name;
        this._ioNum = ioNum;
        this._type = type;
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
export class Input extends IO {
    constructor(funcBlock, name, ioNum, type, value, isCircuitIO = false, ref = undefined, inverted = false) {
        super(funcBlock, name, ioNum, type, value, isCircuitIO);
        this._inverted = false;
        this._ref = ref;
        this._inverted = inverted;
    }
}
export class Output extends IO {
    constructor(funcBlock, name, ioNum, type, value, isCircuitIO = false) {
        super(funcBlock, name, ioNum, type, value, isCircuitIO);
    }
}
export class FunctionBlock {
    constructor(circuit, library, opcode, numInputs, numOutputs) {
        this.circuit = circuit;
        this.library = library;
        this.opcode = opcode;
    }
}
export default class Circuit extends FunctionBlock {
    constructor() {
        super(...arguments);
        this.blocks = new Map();
    }
}
