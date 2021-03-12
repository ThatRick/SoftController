import { EventEmitter } from "../Lib/Events.js"
import { IODataType, Subscriber } from "./CommonTypes.js"
import { FunctionBlockInterface } from "./FunctionBlock.js"


///////////////////////////////
//          IO Pin
///////////////////////////////

export interface IOPinSource
{
    blockNum:   number
    outputNum:  number
    inverted?:  boolean
}

export interface IOPinDefinition
{
    value:      number
    dataType:   IODataType
    name?:      string
}

export interface IOPinInstanceDefinition
{
    value?:     number
    source?:    IOPinSource
}

export enum IOPinEventType
{
    ValueChanged,
    NameChanged,
    DatatypeChanged,
    SourceChanged,
    InvertionChanged,
    Removed
}

export interface IOPinEvent
{
    type:   IOPinEventType
    source: IOPinInterface
}

export interface IOPinInterface
{
    readonly type: 'input' | 'output'
    readonly value: number
    readonly name: string
    readonly datatype: IODataType
    readonly ioNum: number
    readonly block: FunctionBlockInterface
    readonly sourcePin?: IOPinInterface
    readonly inverted?: boolean
    readonly events: EventEmitter<IOPinEvent>

    setValue(n: number): void
    setName(name: string): void
    setDatatype(type: IODataType): void
    setSource(source: IOPinInterface)
    setInverted(inverted: boolean)
    remove(): void
}


export class IOPin implements IOPinInterface
{
    readonly type: 'input' | 'output'
    get value() { return this._value }
    get name() { return this._name }
    get datatype() { return this._datatype }
    get block() { return this._block }
    get ioNum() { return this.getIONum(this) }
    get sourcePin() { return this._sourcePin }
    get inverted() { return this._inverted }

    setValue(value: number) {
        if (this._value != value) {
            this._value = value
            this.events.emit(IOPinEventType.ValueChanged)
        }
    }
    setName(name: string) {
        if (this._name != name) {
            this._name = name
            this.events.emit(IOPinEventType.NameChanged)
        }
    }
    setDatatype(datatype: IODataType) {
        if (this._datatype != datatype) {
            this._datatype = datatype
            this.events.emit(IOPinEventType.DatatypeChanged)
        }
    }
    setSource(source: IOPinInterface) {
        if (this._sourcePin != source) {
            this._sourcePin = source
            if (!source) this.setInverted(false)
            this.events.emit(IOPinEventType.SourceChanged)
        }
    }
    setInverted(inverted: boolean) {
        if (this._inverted != inverted) {
            this._inverted = inverted
            this.events.emit(IOPinEventType.InvertionChanged)
        }
    }

    events = new EventEmitter<IOPinEvent>(this)

    remove() {
        this.events.emit(IOPinEventType.Removed)
        this.events.clear()
        this._sourcePin = null
    }

    toString() {
        const connected = (this.sourcePin) ? 'connected ':' '
        const inverted = (this.inverted) ? 'inverted':''
        const str = (this.name + ': ').padEnd(6) + this.value.toString().padStart(8) + ('  ['+this.datatype+']').padEnd(10) + '  #'+this.ioNum+' ' + connected + inverted
        return str
    }
    
    //////////////////////////////////////////////

    constructor (
        type: 'input' | 'output',
        value: number,
        name: string,
        datatype: IODataType,
        block: FunctionBlockInterface,
        getIONum: (io: IOPinInterface) => number,
    ) {
        this.type = type
        this._value = value
        this._name = name
        this._datatype = datatype
        this._block = block
        this.getIONum = getIONum
    }

    //////////////////////////////////////////////

    protected _value: number
    protected _name: string
    protected _datatype: IODataType
    protected getIONum: (io: IOPinInterface) => number
    protected _block: FunctionBlockInterface
    protected _sourcePin: IOPinInterface
    protected _inverted: boolean
}
