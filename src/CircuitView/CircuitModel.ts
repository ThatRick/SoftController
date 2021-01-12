import {getFunction, getFunctionName} from '../SoftController/FunctionCollection.js'
import { IFunction, IO_FLAG, IO_TYPE, getIOType, setIOType } from '../SoftController/SoftTypes.js'
import { PinType } from './CircuitTypes.js'
import SoftController from '../SoftController/SoftController.js'
import IControllerInterface, { ICircuitData, IFunctionBlockData } from '../SoftController/ControllerInterface.js'

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

export interface IFunctionBlockController {
    funcBlockData: IFunctionBlockData
}

export interface ICircuitController extends IFunctionBlockController {
    circuitData: ICircuitData

}

export class FunctionBlock
{
    constructor(funcData: IFunctionBlockData, id?: number)
    {
        this.isCircuit = (funcData.library > 0)
        const func = (this.isCircuit) ? null : getFunction(funcData.library, funcData.opcode)
        
        this.funcData = funcData
        this.id = id
        this.name = (this.isCircuit) ? 'Circuit' : func.name
        this.setupIO(funcData, func)
    }

    funcData:   IFunctionBlockData       
    isCircuit:  boolean
    func?:      IFunction
    id?:        ID
    name:       string
    comment:    string

    inputs:     Input[] = []
    outputs:    Output[] = []

    setupIO(data: IFunctionBlockData, func: IFunction) {

        for (let inputNum = 0; inputNum < data.inputCount; inputNum++) {
            const ioNum = inputNum
            const name = (func) ? func.inputs[Math.min(inputNum, func.inputs.length - 1)].name : inputNum.toString()
            this.inputs[inputNum] = new Input(this, name, ioNum, data.ioValues[ioNum], data.ioValues[ioNum], this.isCircuit)
        }
        for (let outputNum = 0; outputNum < data.outputCount; outputNum++) {
            const ioNum = data.inputCount + outputNum
            const name = (func) ? func.outputs[Math.min(outputNum, func.inputs.length - 1)].name : outputNum.toString()
            this.outputs[outputNum] = new Output(this, name, ioNum, data.ioValues[ioNum], data.ioValues[ioNum], this.isCircuit)
        }
    }

    static createNew(library: number, opcode: number, customInputCount?: number, customOutputCount?: number) {
        const func = getFunction(library, opcode)
        if (!func) { console.error('Invalid function library/opcode'); return }

        const inputCount = (customInputCount && func.variableInputCount &&
            customInputCount <= func.variableInputCount.max && customInputCount >= func.variableInputCount.min) ? customInputCount : func.inputs.length

        const outputCount = (customOutputCount && func.variableOutputCount &&
            customOutputCount <= func.variableInputCount.max && customOutputCount >= func.variableOutputCount.min) ? customOutputCount : func.outputs.length

        function stretchArray<T>(arr: Array<T>, length: number) {
            while (arr.length < length) arr.push(arr[arr.length - 1])
            while (arr.length > length) arr.pop()
            return arr
        }
            
        const inputValues = stretchArray(func.inputs.map(input => input.initValue), inputCount)
        const inputFlags = stretchArray(func.inputs.map(input => input.flags), inputCount)
        
        const outputValues = stretchArray(func.outputs.map(output => output.initValue), outputCount)
        const outputFlags = stretchArray(func.outputs.map(output => output.flags), outputCount)
        
        const data: IFunctionBlockData = {
            library,
            opcode,
            inputCount,
            outputCount,
            staticCount: func.staticCount,
            functionFlags: 0,
            ioValues: [...inputValues, ...outputValues],
            ioFlags: [...inputFlags, ...outputFlags],
            inputRefs: []
        }

        return new FunctionBlock(data)
    }
}

export class Circuit extends FunctionBlock
{
    constructor(funcData: IFunctionBlockData, circuitData: ICircuitData, id?: number)
    {
        super(funcData, id)
        this.circuitData = circuitData
    }

    circuitData:    ICircuitData
    blocks:         FunctionBlock[] = []

    cpu: IControllerInterface | undefined
    onlineID: number

    createFunction(library: number, opcode: number, customInputCount?: number, customOutputCount?: number, callIndex?: number) {
        const funcBlock = FunctionBlock.createNew(library, opcode, customInputCount, customOutputCount)
        if (!funcBlock) return null
        const id = this.blocks.length
        this.blocks.push(funcBlock)
        funcBlock.id = id

        return funcBlock
    }

    static createNew() {
        const funcData: IFunctionBlockData = {
            library: 0,
            opcode: 0,
            inputCount: 0,
            outputCount: 0,
            staticCount: 0,
            functionFlags: 0,
            ioValues: [],
            ioFlags: [],
            inputRefs: []
        }
        const circuitData: ICircuitData = {
            callIDList: [],
            outputRefs: []
        }

        return new Circuit(funcData, circuitData)
    }

    static async loadOnlineCircuit(cpu: IControllerInterface, circuitID: ID) {
        const funcData = await cpu.getFunctionBlockData(circuitID)
        const circuitData = await cpu.getCircuitData(circuitID)
        
        const circuit = new Circuit(funcData, circuitData)
        // load blocks..
    }
}
