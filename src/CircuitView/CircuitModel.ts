import { IFunction, getFunction } from '../FunctionCollection.js'
import { IOFlag, IODataType, getIOType, setIOType, IORef, ID } from '../Controller/ControllerDataTypes.js'
import { PinType } from './CircuitTypes.js'
import IControllerInterface, { ICircuitData, IFunctionBlockData } from '../Controller/ControllerInterface.js'


export interface IOConnection
{
    sourceBlockID:  number
    outputNum:      number
    inverted:       boolean
}


///////////////////////////////
//            IO
///////////////////////////////
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
    protected _name: string
    protected _ioNum: number
    protected _flags: number
    protected _type:  IODataType
    protected _value: number

    readonly initValue: number

    get name()  { return this._name }
    get ioNum() { return this._ioNum }
    get type()  { return this._type }
    get flags() { return this._flags }
    get value() { return this._value }
    get id()    { return this.funcBlock.offlineID * 1000 + this._ioNum }
    
    setValue(value: number) {
        this._value = value
        this.onValueChanged?.()
    }
    
    onValueChanged?: () => void
}

///////////////////////////////
//          Input
///////////////////////////////
export class Input extends FunctionBlockIO
{    
    constructor (
        funcBlock: FunctionBlock,
        name: string,
        ioNum: number,
        flags: number,
        value: number,
        isCircuitIO = false,
    ) {
        super(funcBlock, name, ioNum, flags, value, 'inputPin', isCircuitIO)
    }

    private _ref: IOConnection

    getConnection() { return this._ref }
    setConnection(sourceBlockID: ID, outputNum: number, inverted = false) {
        this._ref = { sourceBlockID, outputNum, inverted }
        console.log('set connection:', this._ref)
    }
}

///////////////////////////////
//          Output
///////////////////////////////
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
        super(funcBlock, name, ioNum, flags, value, 'outputPin', isCircuitIO)
    }
}


///////////////////////////////
//      Function Block
///////////////////////////////
export class FunctionBlock
{
    constructor(funcData: IFunctionBlockData, readonly offlineID: ID)
    {
        this.isCircuit = (funcData.library == 0)
        const func = (this.isCircuit) ? null : getFunction(funcData.library, funcData.opcode)
        
        this.funcData = funcData
        this.name = (this.isCircuit) ? 'Circuit' : func.name
        this.initIO(funcData, func)
    }

    initIO(data: IFunctionBlockData, func: IFunction) {

        for (let inputNum = 0; inputNum < data.inputCount; inputNum++) {
            const ioNum = inputNum
            const name = (func) ? func.inputs[Math.min(inputNum, func.inputs.length - 1)].name : inputNum.toString()
            this.inputs[inputNum] = new Input(this, name, ioNum, data.ioFlags[ioNum], data.ioValues[ioNum], this.isCircuit)
        }
        for (let outputNum = 0; outputNum < data.outputCount; outputNum++) {
            const ioNum = data.inputCount + outputNum
            const name = (func) ? func.outputs[Math.min(outputNum, func.inputs.length - 1)].name : outputNum.toString()
            this.outputs[outputNum] = new Output(this, name, ioNum, data.ioFlags[ioNum], data.ioValues[ioNum], this.isCircuit)
        }
    }

    funcData:   IFunctionBlockData       
    isCircuit:  boolean
    func?:      IFunction
    name:       string
    comment:    string
    
    inputs:     Input[] = []
    outputs:    Output[] = []
    
    onlineID?:  ID
    cpu:        IControllerInterface

    connectOnline(cpu: IControllerInterface, id: ID) {
        this.onlineID = id
        this.cpu = cpu
    }

    readOnlineIOValues() {
        if (!this.cpu) return

        this.cpu.getFunctionBlockIOValues(this.onlineID).then(ioValues => {
            ioValues.forEach((onlineValue, i) => {
                const currentValues = this.funcData.ioValues
                if (onlineValue != currentValues[i]) {
                    currentValues[i] = onlineValue
                    if (i < this.inputs.length) this.inputs[i].setValue(onlineValue)
                    else this.outputs[i-this.inputs.length].setValue(onlineValue)
                }
            })
        })
    }

    // Create new offline function block data
    static createNewData(library: number, opcode: number, customInputCount?: number, customOutputCount?: number) {
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

        return data
    }

    // Download online function block data
    static async downloadOnlineData(cpu: IControllerInterface, id: ID) {
        const data = await cpu.getFunctionBlockData(id)
        return data
    }
}


///////////////////////////////
//          Circuit
///////////////////////////////
export class Circuit extends FunctionBlock
{
    constructor(funcData: IFunctionBlockData, circuitData: ICircuitData)
    {
        super(funcData, -1)
        this.circuitData = circuitData
    }

    circuitData:    ICircuitData
    blocks:         FunctionBlock[] = []
    onlineBlocks =  new Map<ID, FunctionBlock>()

    createFunction(library: number, opcode: number, customInputCount?: number, customOutputCount?: number, callIndex?: number) {
        const funcData = FunctionBlock.createNewData(library, opcode, customInputCount, customOutputCount)
        const id = this.blocks.length
        const funcBlock = new FunctionBlock(funcData, id)
        if (!funcBlock) return null
        this.blocks.push(funcBlock)

        return funcBlock
    }

    connectBlockInputRef(block: FunctionBlock) {
        block.funcData.inputRefs.forEach((ioRef, i) => {
            if (ioRef) {
                console.log('connect input to ref (online):', ioRef)
                const input = block.inputs[i]
                const sourceBlock = this.onlineBlocks.get(ioRef.id)
                if (sourceBlock) {
                    const outputNum = ioRef.ioNum - sourceBlock.inputs.length
                    const inverted = !!(input.flags & IOFlag.INVERTED)
                    input.setConnection(sourceBlock.offlineID, outputNum, inverted)
                } else console.error('Connect: source block undefined')
            }
        })
    }

    async loadOnlineBlocks() {
        if (!this.cpu) { console.error('Circuit: Can not load online blocks. no controller connected'); return }
    
        let id = this.blocks.length
        this.blocks = await Promise.all(
            this.circuitData.callIDList.map(async onlineID => {
                const data = await FunctionBlock.downloadOnlineData(this.cpu, onlineID)
                const block = new FunctionBlock(data, id++)
                block.connectOnline(this.cpu, onlineID)
                this.onlineBlocks.set(onlineID, block)
                return block
            })
        )
        this.onlineBlocks.set(this.onlineID, this)
        this.blocks.forEach(block => this.connectBlockInputRef(block))
    }

    async readOnlineIOValues() {
        await super.readOnlineIOValues()
        this.blocks.forEach(async block => await block.readOnlineIOValues())
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

    static async downloadOnline(cpu: IControllerInterface, circuitID: ID, loadBlocks = true) {
        const funcData = await cpu.getFunctionBlockData(circuitID)
        const circuitData = await cpu.getCircuitData(circuitID)
        
        const circuit = new Circuit(funcData, circuitData)

        circuit.connectOnline(cpu, circuitID)
        if (loadBlocks) await circuit.loadOnlineBlocks()

        return circuit
    }
}
