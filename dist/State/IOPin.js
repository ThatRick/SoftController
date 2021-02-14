export var IOPinEventType;
(function (IOPinEventType) {
    IOPinEventType[IOPinEventType["Value"] = 0] = "Value";
    IOPinEventType[IOPinEventType["Name"] = 1] = "Name";
    IOPinEventType[IOPinEventType["Datatype"] = 2] = "Datatype";
    IOPinEventType[IOPinEventType["Source"] = 3] = "Source";
    IOPinEventType[IOPinEventType["Inverted"] = 4] = "Inverted";
    IOPinEventType[IOPinEventType["Removed"] = 5] = "Removed";
})(IOPinEventType || (IOPinEventType = {}));
export class IOPin {
    //////////////////////////////////////////////
    constructor(type, value, name, datatype, block, getIONum) {
        this.subscribers = new Set();
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
    get source() { return this._source; }
    get inverted() { return this._inverted; }
    setValue(value) {
        if (this._value != value) {
            this._value = value;
            this.emitEvent(IOPinEventType.Value);
        }
    }
    setName(name) {
        if (this._name != name) {
            this._name = name;
            this.emitEvent(IOPinEventType.Name);
        }
    }
    setDatatype(datatype) {
        if (this._datatype != datatype) {
            this._datatype = datatype;
            this.emitEvent(IOPinEventType.Datatype);
        }
    }
    setSource(source) {
        if (this._source != source) {
            this._source = source;
            this.emitEvent(IOPinEventType.Source);
        }
    }
    setInverted(inverted) {
        if (this._inverted != inverted) {
            this._inverted = inverted;
            this.emitEvent(IOPinEventType.Inverted);
        }
    }
    subscribe(fn) {
        this.subscribers.add(fn);
    }
    unsubscribe(fn) {
        this.subscribers.delete(fn);
    }
    remove() {
        this.emitEvent(IOPinEventType.Removed);
        this.subscribers.clear();
        this._source = null;
    }
    toString() {
        const connected = (this.source) ? 'connected ' : ' ';
        const inverted = (this.inverted) ? 'inverted' : '';
        const str = (this.name + ': ').padEnd(6) + this.value.toString().padStart(8) + ('  [' + this.datatype + ']').padEnd(10) + '  #' + this.ioNum + ' ' + connected + inverted;
        return str;
    }
    //////////////////////////////////////////////
    emitEvent(type) {
        const event = { type, target: this };
        this.subscribers.forEach(fn => fn(event));
    }
}