import { IODataType, Subscriber } from "./CommonTypes.js"
import { FunctionBlockInterface } from "./FunctionBlock.js"


///////////////////////////////
//          IO Pin
///////////////////////////////

export interface IOPinSource
{
    keksijotain: unknown
}

export interface IOPinDefinition
{
    value:      number
    dataType:   IODataType
    name?:      string
}

export interface IOPinInstanceDefinition
{
    value:      number
    source?:    IOPinSource
}

export enum IOPinEventType
{
    Value,
    Name,
    Datatype,
    Source,
    Inverted,
    Removed
}

export interface IOPinEvent
{
    type:   IOPinEventType
    target: IOPinInterface
}

export interface IOPinInterface
{
    readonly type: 'input' | 'output'
    readonly value: number
    readonly name: string
    readonly datatype: IODataType
    readonly ioNum: number
    readonly block: FunctionBlockInterface
    readonly source?: { value: number }
    readonly inverted?: boolean

    setValue(n: number): void
    setName(name: string): void
    setDatatype(type: IODataType): void
    setSource(source: { value: number })
    setInverted(inverted: boolean)

    subscribe(obj: Subscriber<IOPinEvent>)
    unsubscribe(obj: Subscriber<IOPinEvent>)

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
    get source() { return this._source }
    get inverted() { return this._inverted }

    setValue(value: number) {
        if (this._value != value) {
            this._value = value
            this.emitEvent(IOPinEventType.Value)
        }
    }
    setName(name: string) {
        if (this._name != name) {
            this._name = name
            this.emitEvent(IOPinEventType.Name)
        }
    }
    setDatatype(datatype: IODataType) {
        if (this._datatype != datatype) {
            this._datatype = datatype
            this.emitEvent(IOPinEventType.Datatype)
        }
    }
    setSource(source: { value: number }) {
        if (this._source != source) {
            this._source = source
            this.emitEvent(IOPinEventType.Source)
        }
    }
    setInverted(inverted: boolean) {
        if (this._inverted != inverted) {
            this._inverted = inverted
            this.emitEvent(IOPinEventType.Inverted)
        }
    }

    subscribe(fn: Subscriber<IOPinEvent>) {
        this.subscribers.add(fn)
    }
    unsubscribe(fn: Subscriber<IOPinEvent>) {
        this.subscribers.delete(fn)
    }

    remove() {
        this.emitEvent(IOPinEventType.Removed)
        this.subscribers.clear()
        this._source = null
    }

    toString() {
        const connected = (this.source) ? 'connected ':' '
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

    private emitEvent(type: IOPinEventType) {
        const event = { type, target: this }
        this.subscribers.forEach(fn => fn(event))
    }
    private _value: number
    private _name: string
    private _datatype: IODataType
    private getIONum: (io: IOPinInterface) => number
    private _block: FunctionBlockInterface
    private _source: { value: number }
    private _inverted: boolean

    private subscribers = new Set<Subscriber<IOPinEvent>>()
}
