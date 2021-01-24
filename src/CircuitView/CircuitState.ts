import { IFunction, getFunction } from '../FunctionCollection.js'
import { IOFlag, IODataType, getIODataType, setIODataType, IORef, ID, FunctionFlag, MonitorValueChangeStruct } from '../Controller/ControllerDataTypes.js'
import { PinType } from './CircuitTypes.js'
import IControllerInterface, { EventCode, ICircuitData, IFunctionBlockData, MessageResponse } from '../Controller/ControllerInterface.js'
import { readArrayOfStructs } from '../Lib/TypedStructs.js'

const debugLogging = true
function logInfo(...args: any[]) { debugLogging && console.info('State:', ...args)}
function logError(...args: any[]) { console.error('State:', ...args)}


enum FunctionModificationType
{
    SetIOValue,
    SetIOFlags,
    SetIOFlag,
    SetInputRef,
    ChangeInputCount,
    ChangeOutputCount
}

enum CircuitModificationType
{
    AddFunction,
    DeleteFunction,
    ReorderFunctionCall,
    SetOutputRef
}

interface FunctionModification
{
    type: FunctionModificationType
    ioNum?: number
    value?: number
    oldValue?: number
} 

interface CircuitModification
{
    type: CircuitModificationType,
    blockID?: ID,
    blockOnlineID?: ID
    ioNum?: number
    value?: number
}

type ChangeEventHandler = () => void
type ValidadedEventHandler = (success: boolean) => void

///////////////////////////////
//      Function Block
///////////////////////////////

export class FunctionBlock
{
    constructor(readonly funcData: IFunctionBlockData, readonly offlineID: ID, parentCircuit?: Circuit)
    {
        this.isCircuit = (funcData.library == 0)
        this.func = (this.isCircuit) ? null : getFunction(funcData.library, funcData.opcode)
        this.parentCircuit = parentCircuit    
    }

    func?:          IFunction
    
    isCircuit:      boolean
    circuit?:       Circuit
    parentCircuit:  Circuit
        
    cpu:            IControllerInterface
    onlineID?:      ID

    onIOUpdate:    ChangeEventHandler[] = []

    onValidateValueModification:        ValidadedEventHandler[] = []
    onValidateFlagsModification:        ValidadedEventHandler[] = []
    onValidateInputRefModification:     ValidadedEventHandler[] = []

    modifications:  FunctionModification[] = []

    connectOnline(cpu: IControllerInterface, onlineID: ID) {
        cpu.setFunctionBlockFlag(onlineID, FunctionFlag.MONITOR, true)
        this.cpu = cpu
        this.onlineID = onlineID
    }

    ////////////////////////////////////////////
    //      Updates from Controller
    ////////////////////////////////////////////

    updateIOValue(ioNum: number, value: number) {
        const currentValues = this.funcData.ioValues
        if (currentValues[ioNum] != value) {
            currentValues[ioNum] = value
            this.onIOUpdate[ioNum]?.()
        }
    }

    ////////////////////////////////////////////
    //        Modifications from UI
    ////////////////////////////////////////////
    
    // Store modifications to online function
    pushOnlineModification(type: FunctionModificationType, ioNum?: number) {
        logInfo('Online Function Modification', FunctionModificationType[type], this.offlineID, ioNum)
        const modification = { type, ioNum }

        if (this.parentCircuit?.immediateMode || this.circuit?.immediateMode) {
            this.sendModification(modification)
        }
        else if (!this.modifications.find(existing => (existing.type == type && existing.ioNum == ioNum))) {
            this.modifications.push(modification)
        }
    }

    setIOValue(ioNum: number, value: number) {
        const currentValues = this.funcData.ioValues
        if (currentValues[ioNum] != value) {
            currentValues[ioNum] = value
            if (this.onlineID) this.pushOnlineModification(FunctionModificationType.SetIOValue, ioNum)
        }
    }
    setIOFlag(ioNum: number, flag: number, setEnabled: boolean) {
        const currentFlags = this.funcData.ioFlags[ioNum]
        const flags = (setEnabled)
            ? currentFlags | flag
            : currentFlags & ~flag
        this.setIOFlags(ioNum, flags)
    }
    setIOFlags(ioNum: number, flags: number) {
        const currentFlags = this.funcData.ioFlags
        if (currentFlags[ioNum] != flags) {
            currentFlags[ioNum] = flags
            if (this.onlineID) this.pushOnlineModification(FunctionModificationType.SetIOValue, ioNum)
        }
    }
    setInputRef(ioNum: number, sourceBlockID: ID, sourceIONum: number) {
        this.funcData.inputRefs[ioNum] = (sourceBlockID) ? { id: sourceBlockID, ioNum: sourceIONum } : null
        
        if (this.cpu) this.pushOnlineModification(FunctionModificationType.SetInputRef, ioNum)
    }
    deleteFunction() {
        this.parentCircuit.deleteFunctionBlock(this.offlineID)
    }
    changeInputCount() {}
    changeOutputCount() {}

    ///////////////////////

    // Read function block IO values from online CPU
    async updateOnlineValues() {
        const ioValues = await this.cpu.getFunctionBlockIOValues(this.onlineID)
        ioValues.forEach((onlineValue, ioNum) => {
            this.updateIOValue(ioNum, onlineValue)
        })
    }
    // Send all function online modifications
    async sendModifications() {
        for (const modification of this.modifications) {
            await this.sendModification(modification)
        }
        this.modifications = []
    }
    // Send function modification to online CPU
    async sendModification(modification: FunctionModification) {
        
        const ioNum = modification.ioNum

        let success: boolean
        let error: string

        switch (modification.type)
        {
            case FunctionModificationType.SetIOValue:
            {
                const value = this.funcData.ioValues[ioNum]
                success = await this.cpu.setFunctionBlockIOValue(this.onlineID, ioNum, value)
                this.onValidateValueModification[ioNum]?.(success)
                break
            }
            case FunctionModificationType.SetIOFlags:
            {
                const flags = this.funcData.ioFlags[ioNum]
                success = await this.cpu.setFunctionBlockIOFlags(this.onlineID, ioNum, flags)
                this.onValidateFlagsModification[ioNum]?.(success)
                break
            }
            case FunctionModificationType.SetInputRef:
            {
                const connection = this.funcData.inputRefs[ioNum]
                const sourceOnlineID = (connection) ? this.parentCircuit.getBlock(connection.id)?.onlineID : null
                const sourceIONum = (connection) ? connection.ioNum : 0
                                
                success = await this.cpu.connectFunctionBlockInput(
                    this.onlineID, ioNum, sourceOnlineID, sourceIONum)
                    .catch(e => error = e)
                this.onValidateInputRefModification[ioNum]?.(success)
                break
            }
        }
        logInfo('Modification result:', { modification, success, id: this.offlineID, ioNum })
        return success
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
    static async readFuncBlockDataFromOnlineCPU(cpu: IControllerInterface, id: ID) {
        const data = await cpu.getFunctionBlockData(id)
        return data
    }
}


///////////////////////////////
//          Circuit
///////////////////////////////

export class Circuit
{
    constructor(funcData: IFunctionBlockData, circuitData: ICircuitData)
    {
        this.funcState = new FunctionBlock(funcData, -1)
        this.funcState.circuit = this
        this.circuitData = circuitData
    }

    funcState:      FunctionBlock
    circuitData:    ICircuitData

    blocks:         FunctionBlock[] = []
    blocksByOnlineID =  new Map<ID, FunctionBlock>()

    get onlineID() { return this.funcState.onlineID }
    get cpu() { return this.funcState.cpu }

    connectOnline(cpu: IControllerInterface, onlineID: ID) {
        this.funcState.connectOnline(cpu, onlineID)
        this.blocksByOnlineID.set(onlineID, this.funcState)
        cpu.setMonitoring(true)
        cpu.onEventReceived = this.receiveEvent.bind(this)
    }

    receiveEvent(event: MessageResponse) {
        logInfo('Event received:', event)
        switch (event.code)
        {
            case EventCode.MonitoringValues:
            {
                const buffer = event.data as ArrayBuffer
                const updates = readArrayOfStructs(buffer, 0, MonitorValueChangeStruct)
                updates.forEach(update => {
                    const func = this.blocksByOnlineID.get(update.id)
                    func.updateIOValue(update.ioNum, update.value)
                })
            }
        }
    }

    // Get block by ID
    getBlock(offlineID: ID) {
        return (offlineID == -1) ? this.funcState : this.blocks[offlineID]
    }

    ////////////////////////////
    //      Modifications
    ////////////////////////////
    
    // In immediate mode online modifications are sent to CPU immediately
    setImmediateMode(state: boolean) {
        this.immediateMode = state
        return this.immediateMode
    }
    immediateMode = false
    modifications:  CircuitModification[] = []

    onOnlineModificationDone?: (modification: CircuitModification, successful: boolean) => void

    // Store circuit modifications
    pushOnlineModification(type: CircuitModificationType, blockID: ID, ioNum?: number, blockOnlineID?: ID) {
        logInfo('Modification', CircuitModificationType[type], blockID, ioNum)
        const modification = { type, blockID, ioNum, blockOnlineID}
        if (type == CircuitModificationType.DeleteFunction) {
            
        }
        if (this.immediateMode) {
            this.sendModification(modification)
        }
        else if (!this.modifications.find(existing => (existing.type == type && existing.blockID == blockID && existing.ioNum == ioNum))){
            this.modifications.push(modification)
        }
    }
     
    addFunctionBlock(library: number, opcode: number, customInputCount?: number, customOutputCount?: number, callIndex?: number) {
        const funcData = FunctionBlock.createNewData(library, opcode, customInputCount, customOutputCount)
        const offlineID = this.blocks.length
        const funcBlock = new FunctionBlock(funcData, offlineID, this)
        this.blocks.push(funcBlock)
        funcBlock.parentCircuit = this

        if (this.onlineID) this.pushOnlineModification(CircuitModificationType.AddFunction, offlineID)

        return funcBlock
    }

    deleteFunctionBlock(id: ID) {
        const block = this.blocks[id]
        if (this.onlineID) this.pushOnlineModification(CircuitModificationType.DeleteFunction, id, undefined, block.onlineID)
        this.blocksByOnlineID.delete(block.onlineID)
        delete this.blocks[id] 
        this.circuitData.callIDList = this.circuitData.callIDList.filter(callID => callID != id)
    }

    setOutputRef(ioNum: number, sourceBlockID: ID, sourceIONum: number) {
        const outputNum = ioNum - this.funcState.funcData.inputCount
        this.circuitData.outputRefs[outputNum] = (sourceBlockID) ? { id: sourceBlockID, ioNum: sourceIONum } : null
        
        if (this.cpu) this.pushOnlineModification(CircuitModificationType.SetOutputRef, null, ioNum)
    }

    // Send circuit modifications to online CPU

    async sendModifications() {
        if (!this.cpu) { console.error('Upload changes: No online CPU connection'); return }

        for (const block of this.blocks) {
            await block?.sendModifications()
        }
        for (const modification of this.modifications) {
            await this.sendModification(modification)
        }
        this.modifications = []
    }

    // Send circuit modification to online CPU
    async sendModification(modification: CircuitModification)
    {    
        const { blockID, ioNum, blockOnlineID } = modification
        
        const block = this.getBlock(blockID)
        
        let success: boolean
        let error: string

        switch (modification.type)
        {
            case CircuitModificationType.AddFunction:
            {
                const data = block.funcData
                const onlineID = await this.cpu.createFunctionBlock(
                    data.library, data.opcode, this.onlineID, undefined,
                    data.inputCount, data.outputCount, data.staticCount).catch(e => error = e)
                if (onlineID) {
                    block.connectOnline(this.cpu, onlineID)
                    success = true
                }
                break
            }
            case CircuitModificationType.DeleteFunction:
            {
                success = await this.cpu.deleteFunctionBlock(blockOnlineID)
                break
            }
            case CircuitModificationType.SetOutputRef:
                {
                    const outputNum = ioNum - this.funcState.funcData.inputCount

                    const connection = this.circuitData.outputRefs[outputNum]

                    const sourceOnlineID = (connection) ? this.getBlock(connection.id)?.onlineID : null
                    const sourceIONum = (connection) ? connection.ioNum : 0
                    success = await this.cpu.connectCircuitOutput(
                        this.onlineID, outputNum, sourceOnlineID, sourceIONum).catch(e => error = e)
                    break
                }
        }

        logInfo('Modification result:', { type: CircuitModificationType[modification.type], success, blockOfflineID: blockID, ioNum })
        this.onOnlineModificationDone?.(modification, success)
        return success
    }

    ///////////////////////////////
    //      Online functions
    ///////////////////////////////

    // Read circuit and it's blocks IO values from online CPU
    async getOnlineValues() {
        if (!this.cpu) return
        await this.funcState.updateOnlineValues()
        this.blocks.forEach(block => {
            block.updateOnlineValues()
        })
    }

    // Load function blocks from online CPU
    async getOnlineFunctionBlocks() {
        if (!this.cpu) { console.error('Circuit: Can not load online blocks. no controller connected'); return }
        // Get first free offline ID
        let offlineID = this.blocks.length
        // Load circuit's function blocks from CPU
        this.blocks = await Promise.all(
            this.circuitData.callIDList.map(async onlineID => {
                const data = await FunctionBlock.readFuncBlockDataFromOnlineCPU(this.cpu, onlineID)
                const block = new FunctionBlock(data, offlineID++, this)
                block.connectOnline(this.cpu, onlineID)
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
    static async getOnlineCircuit(cpu: IControllerInterface, circuitOnlineID: ID, loadBlocks = true) {
        const funcData = await cpu.getFunctionBlockData(circuitOnlineID)
        const circuitData = await cpu.getCircuitData(circuitOnlineID)
        
        const circuit = new Circuit(funcData, circuitData)
        circuit.connectOnline(cpu, circuitOnlineID)
        if (loadBlocks) await circuit.getOnlineFunctionBlocks()

        return circuit
    }
}

