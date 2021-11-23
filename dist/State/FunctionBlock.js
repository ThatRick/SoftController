import { EventEmitter } from "../Lib/Events.js";
import { IOPin } from "./IOPin.js";
export class FunctionBlock {
    get typeName() { return this._typeName; }
    get symbol() { return this._symbol; }
    get description() { return this._description; }
    inputs;
    outputs;
    //readonly    circuit?:           CircuitInterface
    variableInputs;
    variableOutputs;
    typeDef;
    events = new EventEmitter(this);
    get callIndex() { return this.parentCircuit?.getBlockIndex(this); }
    setCallIndex(n) {
        this.parentCircuit?.setBlockIndex(this, n);
    }
    setVariableInputCount(n) {
        console.log('Set variable input count to', n);
        if (!this.variableInputs)
            return;
        const { min, max, initialCount: initial, structSize = 1 } = this.variableInputs;
        if (n < min)
            n = min;
        if (n > max)
            n = max;
        const staticInputsCount = Object.keys(this.typeDef.inputs).length - initial * structSize;
        const currentVariableInputsCount = (this.inputs.length - staticInputsCount) / structSize;
        console.assert(currentVariableInputsCount % 1 == 0);
        const addition = n - currentVariableInputsCount;
        if (addition == 0)
            return;
        // Remove inputs
        if (addition < 0) {
            const newLength = staticInputsCount + n * structSize;
            while (this.inputs.length > newLength) {
                const input = this.inputs.pop();
                input.remove();
                this.events.emit(4 /* InputRemoved */);
            }
        }
        // Add inputs
        if (addition > 0) {
            const initialInputs = Object.values(this.typeDef.inputs).map(input => {
                const emptyName = (input.name == '');
                const name = (input.name) ? splitToStringAndNumber(input.name || '')[0] : '';
                return { name, value: input.value, dataType: input.datatype, emptyName };
            });
            const initialStruct = initialInputs.slice(staticInputsCount, staticInputsCount + structSize);
            const currentLastIndex = this.inputs.length - structSize;
            const numberingStart = splitToStringAndNumber(this.inputs[currentLastIndex].name)[1] + 1;
            for (let i = 0; i < addition; i++) {
                const numbering = (numberingStart + i).toString();
                const newInputs = initialStruct.map(({ name, value, dataType, emptyName }) => {
                    return new IOPin('input', value, emptyName ? '' : name + numbering, dataType, this);
                });
                newInputs.forEach(input => {
                    this.inputs.push(input);
                    this.events.emit(3 /* InputAdded */);
                });
            }
        }
        this.events.emit(0 /* InputCountChanged */);
    }
    setVariableOutputCount(n) { }
    addInput(dataType, name) {
        name ??= 'Input' + this.inputs.length;
        const input = new IOPin('input', 0, name, dataType, this);
        this.inputs.push(input);
        this.events.emit(3 /* InputAdded */);
        return input;
    }
    addOutput(dataType, name) {
        name ??= 'Output' + this.outputs.length;
        const output = new IOPin('output', 0, name, dataType, this);
        this.outputs.push(output);
        this.events.emit(5 /* OutputAdded */);
        return output;
    }
    removeInput(input) {
        const index = this.inputs.indexOf(input);
        if (index == -1) {
            console.error('Remove input: Input not found in function block inputs', input);
            return;
        }
        this.inputs.splice(index, 1);
        input.remove();
        this.events.emit(4 /* InputRemoved */);
    }
    removeOutput(output) {
        const index = this.outputs.indexOf(output);
        if (index == -1) {
            console.error('Remove output: Output not found in function block outputs', output);
            return;
        }
        this.outputs.splice(index, 1);
        output.remove();
        this.events.emit(6 /* OutputRemoved */);
    }
    update(dt) {
        this.updateInputs();
        const inputs = this.inputs.map(input => input.value);
        const outputs = this.outputs.map(outputs => outputs.value);
        let ret = this.run(inputs, outputs, dt);
        if (ret === null)
            return;
        else if (typeof ret == 'object') {
            ret.forEach((value, i) => this.outputs[i].setValue(value));
        }
        else if (typeof ret == 'number') {
            this.outputs[0].setValue(ret);
        }
    }
    remove() {
        this.inputs.forEach(input => input.remove());
        this.outputs.forEach(output => output.remove());
        if (this.parentCircuit) {
            this.parentCircuit.removeBlock(this);
        }
        this.events.emit(2 /* Removed */);
        this.events.clear();
    }
    toString() {
        let text = '';
        const addLine = (line) => text += (line + '\n');
        addLine('Name: ' + this.typeName);
        addLine('Symbol: ' + this.symbol);
        addLine('Description: ' + this.description);
        addLine('Inputs:');
        this.inputs.forEach(input => addLine('  ' + input.toString()));
        addLine('');
        addLine('Outputs:');
        this.outputs.forEach(output => addLine('  ' + output.toString()));
        addLine('');
        this.parentCircuit && addLine('Parent circuit: ' + this.parentCircuit);
        this.variableInputs && addLine('Variable inputs: ' + this.variableInputs.min + ' - ' + this.variableInputs.max);
        this.variableOutputs && addLine('Variable outputs: ' + this.variableOutputs.min + ' - ' + this.variableOutputs.max);
        return text;
    }
    setTypeName(name) { this._typeName = name; }
    getIONum(io) {
        let ioNum = (io.type == 'input')
            ? this.inputs.indexOf(io)
            : this.outputs.indexOf(io);
        if (ioNum > -1 && io.type == 'output')
            ioNum += this.inputs.length;
        return ioNum;
    }
    parentCircuit;
    //////////////  CONSTRUCTOR /////////////////
    constructor(typeDef) {
        this.typeDef = typeDef;
        this.inputs = typeDef.inputs.map(input => {
            return new IOPin('input', input.value, input.name, input.datatype, this);
        });
        this.outputs = typeDef.outputs.map(output => {
            return new IOPin('output', output.value, output.name, output.datatype, this);
        });
        this._symbol = this.typeDef.symbol;
        this._description = this.typeDef.description;
        this.variableInputs = typeDef.variableInputs;
        this.variableOutputs = typeDef.variableOutputs;
        this.staticVariables = { ...typeDef.staticVariables };
    }
    staticVariables;
    _typeName;
    _symbol;
    _description;
    updateInputs() {
        this.inputs.forEach(input => {
            if (input.sourceIO) {
                let newValue = input.sourceIO.value;
                if (input.inverted)
                    newValue = (newValue) ? 0 : 1;
                else if (input.datatype == 'INTEGER')
                    newValue = Math.trunc(newValue);
                input.setValue(newValue);
            }
        });
    }
}
///////////////////////////////
//     MISC Functions
///////////////////////////////
const splitToStringAndNumber = (text) => {
    const matched = text.match(/(\d+)$/);
    if (!matched)
        return [text, 0];
    const value = parseInt(matched[0], 10);
    if (isNaN(value))
        return [text, 0];
    const strEnd = text.length - matched.length;
    const str = text.substring(0, strEnd);
    return [str, value];
};
