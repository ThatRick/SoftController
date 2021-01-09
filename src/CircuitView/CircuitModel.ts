import {getFunction, getFunctionName} from '../SoftController/FunctionCollection.js'
import { IFunction, IO_FLAG, IO_TYPE, getIOType, setIOType } from '../SoftController/SoftTypes.js'
import { PinType } from './CircuitTypes.js'

type ID = number

interface IO_REF
{
    id:         ID
    ioNum:      number
}

export abstract class FunctionBlockIO
{
    constructor(
        public readonly funcBlock: FunctionBlock,
        name: string,
        ioNum: number,
        flags: number,
        value: number,
        pinType: PinType,
        public readonly isCircuitIO = false
    ) {
        this._name = name
        this._ioNum = ioNum
        this._flags = flags
        this._type = getIOType(flags)
        this._value = value
        this.initValue = value
        this.pinType = pinType
    }

    readonly pinType: PinType
    _name: string
    _ioNum: number
    _flags: number
    _type:  IO_TYPE
    _value: number

    readonly initValue: number

    get name()  { return this._name }
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

export class Input extends FunctionBlockIO
{    
    constructor (
        funcBlock: FunctionBlock,
        name: string,
        ioNum: number,
        flags: number,
        value: number,
        isCircuitIO = false,
        ref: IO_REF = undefined,
    ) {
        super(funcBlock, name, ioNum, flags, value, 'input', isCircuitIO)

        this._ref = ref
        this._inverted = !!(flags & IO_FLAG.INVERTED)
    }

    _ref: IO_REF
    _inverted: boolean

}

export class Output extends FunctionBlockIO
{
    constructor (
        funcBlock: FunctionBlock,
        name: string,
        ioNum: number,
        flags: number,
        value: number,
        isCircuitIO = false,
    ) {
        super(funcBlock, name, ioNum, flags, value, 'output', isCircuitIO)
    }
}

export class FunctionBlock
{
    constructor(
        public circuit: Circuit | undefined,
        public readonly library: number,
        public readonly opcode: number,
        numInputs = 0,
        numOutputs = 0,
    ) {
        if (library) {
            this.func = getFunction(library, opcode)
            this.name = this.func.name
            this.defineFunctionTypeIO(this.func, numInputs, numOutputs)
        } else {
            this.name = 'Circuit'
            this.defineCircuitIO(numInputs, numOutputs)
        }
    }

    defineCircuitIO(numInputs, numOutputs) {
        let ioNum = 0

        for (let inputNum = 0; inputNum < numInputs; inputNum++) {
            this.inputs[inputNum] = new Input(this, inputNum.toString(), ioNum++, 0, 0, true)
        }
        for (let outputNum = 0; outputNum < numOutputs; outputNum++) {
            this.outputs[outputNum] = new Output(this, outputNum.toString(), ioNum++, 0, 0, true)
        }
    }

    defineFunctionTypeIO(func: IFunction, numInputs: number, numOutputs: number) {
        numInputs = (numInputs && func.variableInputCount &&
            numInputs <= func.variableInputCount.max && numInputs >= func.variableInputCount.min) ? numInputs : func.inputs.length

        numOutputs = (numOutputs && func.variableInputCount &&
            numOutputs <= func.variableInputCount.max && numOutputs >= func.variableInputCount.min) ? numOutputs : func.outputs.length

        let ioNum = 0

        for (let inputNum = 0; inputNum < numInputs; inputNum++) {
            const input = func.inputs[Math.min(inputNum, func.inputs.length - 1)]
            this.inputs[inputNum] = new Input(this, input.name, ioNum++, input.flags, input.initValue)
        }
        for (let outputNum = 0; outputNum < numOutputs; outputNum++) {
            const output = func.outputs[Math.min(outputNum, func.outputs.length - 1)]
            this.outputs[outputNum] = new Output(this, output.name, ioNum++, output.flags, output.initValue)
        }
    }

    func?:      IFunction
    id:         ID
    name:       string
    comment:    string

    inputs:     Input[] = []
    outputs:    Output[] = []
}

export class Circuit extends FunctionBlock
{
    blocks:     Map<ID, FunctionBlock> = new Map<ID, FunctionBlock>()
    callList:   ID[]
}
