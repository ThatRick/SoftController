import { IFunction, getFunction } from '../FunctionCollection.js'
import { IOFlag, IODataType, getIODataType, setIODataType, IORef, ID } from '../Controller/ControllerDataTypes.js'
import { PinType } from './CircuitTypes.js'
import IControllerInterface, { ICircuitData, IFunctionBlockData } from '../Controller/ControllerInterface.js'


export interface IOConnection
{
    sourceBlockID:  number
    ioNum:          number
    inverted:       boolean
}

export enum ModificationType
{
    ADD_BLOCK,
    ADD_CIRCUIT_INPUT,
    ADD_CIRCUIT_OUTPUT,
    SET_IO_VALUE,
    CONNECT_FUNCTION_INPUT,
    CONNECT_CIRCUIT_OUTPUT,
    DELETE_BLOCK,
    DELETE_CIRCUIT_INPUT,
    DELETE_CIRCUIT_OUTPUT,
    DELETE_CONNECTION
}

export interface Modification
{
    type: ModificationType,
    blockID: ID,
    ioNum?: number
}

type ChangeEventHandler = () => void


///////////////////////////////
//      Function Block
///////////////////////////////

export class FunctionBlock
{
    constructor(readonly funcData: IFunctionBlockData, readonly offlineID: ID)
    {
        this.isCircuit = (funcData.library == 0)
        this.func = (this.isCircuit) ? null : getFunction(funcData.library, funcData.opcode)        
    }

    func?:      IFunction
    
    isCircuit:  boolean
    parentCircuit?: Circuit
        
    onlineID?:  ID

    onIOChanged: ChangeEventHandler[] = []

    connectOnline(onlineID: ID) {
        this.onlineID = onlineID
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
    static async readOnlineData(cpu: IControllerInterface, id: ID) {
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
    blocksByOnlineID =  new Map<ID, FunctionBlock>()
    
    cpu:            IControllerInterface
    modifications:  Modification[] = []

    modified(type: ModificationType, blockID: ID, ioNum?: number) {
        this.modifications.push({ type, blockID, ioNum })
    }

    onModificationUploaded?: (type: ModificationType, successful: boolean, blockID: ID, ioNum?: number) => void

    getBlock(offlineID: ID) {
        return (offlineID == -1) ? this : this.blocks[offlineID]
    }

    ////////////////////////////
    //      Modifications
    ////////////////////////////
    
    setIOValue(blockID: ID, ioNum: number, value: number, isOnlineReadback=false) {
        const block = this.getBlock(blockID)
        const currentValues = block.funcData.ioValues
        if (currentValues[ioNum] != value) {
            currentValues[ioNum] = value
            block.onIOChanged[ioNum]?.()

            if (this.cpu && !isOnlineReadback) this.modified(ModificationType.SET_IO_VALUE, blockID, ioNum)
        }
    }

    addFunctionBlock(library: number, opcode: number, customInputCount?: number, customOutputCount?: number, callIndex?: number) {
        const funcData = FunctionBlock.createNewData(library, opcode, customInputCount, customOutputCount)
        const offlineID = this.blocks.length
        const funcBlock = new FunctionBlock(funcData, offlineID)
        this.blocks.push(funcBlock)
        funcBlock.parentCircuit = this

        if (this.cpu) this.modified(ModificationType.ADD_BLOCK, offlineID)

        return funcBlock
    }

    connectFunctionBlockInput(targetBlockID: ID, targetInputNum: number, sourceBlockID: ID, sourceIONum: number, inverted = false) {
        const targetBlock = this.getBlock(targetBlockID)
        targetBlock.funcData.inputRefs[targetInputNum] = { id: sourceBlockID, ioNum: sourceIONum }
        
        if (this.cpu) this.modified(ModificationType.CONNECT_FUNCTION_INPUT, targetBlock.offlineID, targetInputNum)
    }

    disconnectFunctionBlockInput(blockID: ID, inputNum: number) {
        const targetBlock = this.getBlock(blockID)
        targetBlock.funcData.inputRefs[inputNum] = undefined

        if (this.cpu) this.modified(ModificationType.DELETE_CONNECTION, targetBlock.offlineID, inputNum)
    }

    // Read IO values from online CPU
    async readOnlineValues() {
        if (!this.cpu) return
        await this.readOnlineBlockIOValues(this.offlineID)
        for (const block of this.blocks) {
            this.readOnlineBlockIOValues(block.offlineID)
        }
    }

    async readOnlineBlockIOValues(blockID: ID) {
        const block = this.getBlock(blockID)
        const ioValues = await this.cpu.getFunctionBlockIOValues(block.onlineID)
        ioValues.forEach((onlineValue, ioNum) => {
            this.setIOValue(blockID, ioNum, onlineValue, true)
        })
    }

    // Load function blocks from online CPU
    async readOnlineFunctionBlocks() {
        if (!this.cpu) { console.error('Circuit: Can not load online blocks. no controller connected'); return }
        // Set self to online blocks for connecting circuit inputs to block IO
        this.blocksByOnlineID.set(this.onlineID, this)
        // Get first free offline ID
        let offlineID = this.blocks.length
        // Load circuit's function blocks from CPU
        this.blocks = await Promise.all(
            this.circuitData.callIDList.map(async onlineID => {
                const data = await FunctionBlock.readOnlineData(this.cpu, onlineID)
                const block = new FunctionBlock(data, offlineID++)
                block.connectOnline(onlineID)
                this.blocksByOnlineID.set(onlineID, block)
                return block
            })
        )
        // Connect loaded function blocks
        this.blocks.forEach(block => {
            block.funcData.inputRefs.forEach((ioRef, i, ioRefs) => {
                if (ioRef) {
                    const sourceBlock = this.blocksByOnlineID.get(ioRef.id)
                    if (sourceBlock) {
                        // Change block reference form online to offline ID
                        ioRefs[i].id = sourceBlock.offlineID
                    } else console.error('Connect: source block undefined')
                }
            })
        })
    }

    async sendChanges() {
        if (!this.cpu) { console.error('Upload changes: No online CPU connection'); return }

        for (const modification of this.modifications.values()) {
            await this.sendModification(modification.type, modification.blockID, modification.ioNum)
        }
        this.modifications = []
    }

    async sendModification(type: ModificationType, blockOfflineID: ID, ioNum?: number) {
        let success: boolean
        let error: string

        switch (type)
        {
            case ModificationType.SET_IO_VALUE:
            {
                const block = (blockOfflineID == -1) ? this : this.blocks[blockOfflineID]
                const value = block.funcData.ioValues[ioNum]
                success = await this.cpu.setFunctionBlockIOValue(block.onlineID, ioNum, value)
                break
            }

            case ModificationType.ADD_BLOCK:
            {
                const block = this.blocks[blockOfflineID]
                const data = block.funcData
                const onlineID = await this.cpu.createFunctionBlock(
                    data.library, data.opcode, this.onlineID, undefined,
                    data.inputCount, data.outputCount, data.staticCount).catch(e => error = e)
                if (onlineID) {
                    block.connectOnline(onlineID)
                    success = true
                }
                break
            }

            case ModificationType.CONNECT_FUNCTION_INPUT:
            {
                const targetBlock = this.blocks[blockOfflineID]
                const connection = targetBlock.funcData.inputRefs[ioNum]
                const sourceBlock = (connection.id == -1) ? this : this.blocks[connection.id]

                const targetOnlineID = targetBlock.onlineID
                const sourceOnlineID = sourceBlock.onlineID
                
                if (!targetOnlineID || !sourceOnlineID) { error = 'Invalid source of target block ID'; break }
                
                success = await this.cpu.connectFunctionBlockInput(
                    targetOnlineID, ioNum, sourceOnlineID, connection.ioNum).catch(e => error = e)
                break
            }

            case ModificationType.DELETE_CONNECTION:
            {
                const targetBlock = this.blocks[blockOfflineID]
                success = await this.cpu.connectFunctionBlockInput(targetBlock.onlineID, ioNum, 0, 0).catch(e => error = e)
            }
        }
        const typeName = ModificationType[type]
        console.log('Modification result:', { type: typeName, success, blockOfflineID, ioNum })
        this.onModificationUploaded?.(type, success, blockOfflineID, ioNum)
        return success
    }

    ///////////////////////////////
    //      STATIC FUNCTIONS
    ///////////////////////////////

    // Create new empty circuit
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

    // Download circuit from online CPU
    static async loadOnline(cpu: IControllerInterface, circuitOnlineID: ID, loadBlocks = true) {
        const funcData = await cpu.getFunctionBlockData(circuitOnlineID)
        const circuitData = await cpu.getCircuitData(circuitOnlineID)
        
        const circuit = new Circuit(funcData, circuitData)
        circuit.cpu = cpu
        circuit.connectOnline(circuitOnlineID)
        if (loadBlocks) await circuit.readOnlineFunctionBlocks()

        return circuit
    }
}

