import { EventEmitter } from "../Lib/Events.js";
export var IOPinEventType;
(function (IOPinEventType) {
    IOPinEventType[IOPinEventType["ValueChanged"] = 0] = "ValueChanged";
    IOPinEventType[IOPinEventType["NameChanged"] = 1] = "NameChanged";
    IOPinEventType[IOPinEventType["DatatypeChanged"] = 2] = "DatatypeChanged";
    IOPinEventType[IOPinEventType["SourceChanged"] = 3] = "SourceChanged";
    IOPinEventType[IOPinEventType["InvertionChanged"] = 4] = "InvertionChanged";
    IOPinEventType[IOPinEventType["Removed"] = 5] = "Removed";
})(IOPinEventType || (IOPinEventType = {}));
export class IOPin {
    //////////////////////////////////////////////
    constructor(type, value, name, datatype, block, getIONum) {
        this.events = new EventEmitter(this);
        this.type = type;
        this._value = value;
        this._name = name;
        this._datatype = datatype;
        this._block = block;
        this.getIONum = getIONum;
    }
    get value() { return this._value; }
    get name() { return this._name; }
    get datatype() { return this._datatype; }
    get block() { return this._block; }
    get ioNum() { return this.getIONum(this); }
    get sourcePin() { return this._sourcePin; }
    get inverted() { return this._inverted; }
    setValue(value) {
        if (this._value != value) {
            this._value = value;
            this.events.emit(IOPinEventType.ValueChanged);
        }
    }
    setName(name) {
        if (this._name != name) {
            this._name = name;
            this.events.emit(IOPinEventType.NameChanged);
        }
    }
    setDatatype(datatype) {
        if (this._datatype != datatype) {
            this._datatype = datatype;
            this.events.emit(IOPinEventType.DatatypeChanged);
        }
    }
    setSource(source) {
        if (this._sourcePin != source) {
            this._sourcePin = source;
            this.events.emit(IOPinEventType.SourceChanged);
        }
    }
    setInverted(inverted) {
        if (this._inverted != inverted) {
            this._inverted = inverted;
            this.events.emit(IOPinEventType.InvertionChanged);
        }
    }
    remove() {
        this.events.emit(IOPinEventType.Removed);
        this.events.clear();
        this._sourcePin = null;
    }
    toString() {
        const connected = (this.sourcePin) ? 'connected ' : ' ';
        const inverted = (this.inverted) ? 'inverted' : '';
        const str = (this.name + ': ').padEnd(6) + this.value.toString().padStart(8) + ('  [' + this.datatype + ']').padEnd(10) + '  #' + this.ioNum + ' ' + connected + inverted;
        return str;
    }
}
