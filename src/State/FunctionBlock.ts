import { IODataType } from '../Controller/ControllerDataTypes.js'

type Subscriber<T> = (event: T) => void


///////////////////////////////
//          IO Pin
///////////////////////////////

interface IOPinDefinition
{
    value: number,
    dataType: IODataType
    name?: string,
}

enum IOPinEventType {
    Value,
    Name,
    Datatype,
    Source,
    Inverted,
    Removed
}

interface IOPinEvent {
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


///////////////////////////////
//      Function Block
///////////////////////////////

interface FunctionBlockDefinitionOLD
{
    name: string
    inputs: IOPinDefinition[]
    outputs: IOPinDefinition[]
}


interface FunctionBlockDefinition
{
    name:    string
    inputs:  {[name: string]: IOPinDefinition }
    outputs: {[name: string]: IOPinDefinition }
    variableInputs?: VariableIODefinition
    variableOutputs?: VariableIODefinition
}

interface VariableIODefinition {
    min: number,
    max: number,
    step: number
}

enum BlockEventType {
    Name,
    InputCount,
    OutputCount,
    Removed
}

interface BlockEvent {
    type:   BlockEventType
    target: FunctionBlockInterface
}

export interface FunctionBlockInterface
{
    readonly type: 'function' | 'circuit'
    readonly name: string
    readonly symbol?: string
    readonly description: string
    readonly inputs: IOPinInterface[]
    readonly outputs: IOPinInterface[]
    readonly parentCircuit?: ICircuit
    readonly variableInputs?: VariableIODefinition
    readonly variableOutputs?: VariableIODefinition

    setName(name: string): void
    setInputCount(n: number): void
    setOutputCount(n: number): void
    update(dt: number): void

    subscribe(obj: Subscriber<BlockEvent>): void
    unsubscribe(obj: Subscriber<BlockEvent>): void

    remove(): void
}

type IOValues<T> = {
    [K in keyof T]: number
}


export abstract class FunctionBlock implements FunctionBlockInterface
{
    readonly    type: 'function'
    get         name()                  { return this._name }
    get         symbol()                { return this._symbol }
    get         description()           { return this._description }
    readonly    inputs:                 IOPinInterface[]
    readonly    outputs:                IOPinInterface[]
    get         parentCircuit()         { return this._parentCircuit }
    readonly    variableInputs?:        VariableIODefinition
    readonly    variableOutputs?:       VariableIODefinition

    setName(name: string) {
        if (this._name != name) {
            this._name = name
            this.emitEvent(BlockEventType.Name)
        }
    }
    setInputCount(n: number) { }
    setOutputCount(n: number) { }

    update(dt: number) {
        this.updateInputs()
        const inputs = this.inputs.map(input => input.value)
        let outputs = this.outputs.map(outputs => outputs.value)
        outputs = this.run(inputs, outputs, dt)
        outputs.forEach((value, i) => this.outputs[i].setValue(value))
    }

    subscribe(obj: Subscriber<BlockEvent>) {
        this.subscribers.add(obj)
    }
    unsubscribe(obj: Subscriber<BlockEvent>) {
        this.subscribers.delete(obj)
    }

    remove() {
        this.inputs.forEach(input => input.remove())
        this.outputs.forEach(input => input.remove())
        this.emitEvent(BlockEventType.Removed)
        this.subscribers.clear()
    }

    //////////////  CONSTRUCTOR /////////////////
    
    constructor(def: FunctionBlockDefinition) {
        this.inputs = Object.entries(def.inputs).map(([name, input]) => {
            return new IOPin('input', input.value, name, input.dataType, this, this.getIONum )
        })
        this.outputs = Object.entries(def.outputs).map(([name, output]) => {
            return new IOPin('output', output.value, name, output.dataType, this, this.getIONum )
        })
    }

    ////////////////  PRIVATE ///////////////////

    private _name: string
    private _symbol: string
    private _description: string

    private _parentCircuit?: ICircuit

    private subscribers = new Set<Subscriber<BlockEvent>>()
    
    private emitEvent(type: BlockEventType) {
        const event = { type, target: this }
        this.subscribers.forEach(fn => fn(event))
    }
    
    protected abstract run: (inputs: number[], outputs: number[], dt: number) => number[]
    
    private updateInputs() {
        this.inputs.forEach(input => {
            if (input.source) {
                let newValue = input.source.value
                if (input.inverted) newValue = (newValue) ? 0 : 1
                else if (input.datatype == IODataType.INTEGER) newValue = Math.trunc(newValue)
                input.setValue(newValue)
            }
        })
    }

    private getIONum = (io: IOPinInterface) => {
        if (io.type == 'input') return this.inputs.findIndex(input => input == io)
        else return this.outputs.findIndex(output => output == io) + this.inputs.length
    }

}

///////////////////////////////
//          Circuit
///////////////////////////////

enum CircuitEvent {
    BlockAdded,
    BlockRemoved
}
export interface ICircuit extends FunctionBlockInterface
{
    blocks: FunctionBlockInterface[]
}