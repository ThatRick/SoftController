type ID = number

const enum IO_TYPE {
    REAL,
    INTEGER,
    BINARY
}

interface IO_REF
{
    id:         ID
    ioNum:      number
}

class IO
{
    constructor(
        public readonly funcBlock: FunctionBlock,
        name: string,
        ioNum: number,
        type: IO_TYPE,
        value: number,
        public readonly isCircuitIO = false
    ) {
        this._name = name
        this._ioNum = ioNum
        this._type = type
        this._value = value
        this.initValue = value
    }

    _name: string
    _ioNum: number
    _type:  IO_TYPE
    _value: number

    readonly initValue: number

    get ioNum() { return this._ioNum }
    get type()  { return this._type }
    get value() { return this._value }
    get id()    { return this.funcBlock.id * 1000 + this._ioNum }
    
    set value(value: number) {
        this._value = value
        this.onValueChanged?.(this._ioNum, value)
    }
    
    onValueChanged?: (ioNum, value) => void = undefined
}

export class Input extends IO
{    
    constructor (
        funcBlock: FunctionBlock,
        name: string,
        ioNum: number,
        type: IO_TYPE,
        value: number,
        isCircuitIO = false,
        ref: IO_REF = undefined,
        inverted = false
    ) {
        super(funcBlock, name, ioNum, type, value, isCircuitIO)

        this._ref = ref
        this._inverted = inverted
    }

    _ref: IO_REF
    _inverted: boolean = false

}

export class Output extends IO
{
    constructor (
        funcBlock: FunctionBlock,
        name: string,
        ioNum: number,
        type: IO_TYPE,
        value: number,
        isCircuitIO = false,
    ) {
        super(funcBlock, name, ioNum, type, value, isCircuitIO)
    }
}

export class FunctionBlock
{
    constructor(
        public circuit: Circuit | undefined,
        public readonly library: number,
        public readonly opcode: number,
        numInputs?: number,
        numOutputs?: number,
    ) {

    }

    id:         ID
    name:       string
    comment:    string

    inputs:     Input[]
    outputs:    Output[]
}

export default class Circuit extends FunctionBlock
{
    blocks:     Map<ID, FunctionBlock> = new Map<ID, FunctionBlock>()
    callList:   ID[]
}
