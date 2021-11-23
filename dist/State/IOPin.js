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
    type;
    get value() { return this._value; }
    get name() { return this._name; }
    get datatype() { return this._datatype; }
    get block() { return this._block; }
    get ioNum() { return this._block.getIONum(this); }
    get sourceIO() { return this._sourcePin; }
    get inverted() { return this._inverted; }
    events = new EventEmitter(this);
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
            if (!source)
                this.setInversion(false);
            this.events.emit(IOPinEventType.SourceChanged);
        }
    }
    setInversion(inverted) {
        if (this._inverted != inverted) {
            this._inverted = inverted;
            this.events.emit(IOPinEventType.InvertionChanged);
        }
    }
    remove() {
        this.events.emit(IOPinEventType.Removed);
        this.events.clear();
        this.events = null;
        this._sourcePin = null;
        this._block = null;
    }
    toString() {
        const connected = (this.sourceIO) ? 'connected ' : ' ';
        const inverted = (this.inverted) ? 'inverted' : '';
        const str = (this.name + ': ').padEnd(6) + this.value.toString().padStart(8) + ('  [' + this.datatype + ']').padEnd(10) + '  #' + this.ioNum + ' ' + connected + inverted;
        return str;
    }
    //////////////////////////////////////////////
    constructor(type, value, name, datatype, block) {
        this.type = type;
        this._value = value;
        this._name = name;
        this._datatype = datatype;
        this._block = block;
    }
    //////////////////////////////////////////////
    _value;
    _name;
    _datatype;
    _block;
    _sourcePin;
    _inverted;
}
