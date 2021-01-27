import { FunctionFlag, ID } from "../Controller/ControllerDataTypes.js"
import IControllerInterface, { IFunctionBlockData } from "../Controller/ControllerInterface.js"
import { getFunction, IFunction } from "../FunctionCollection.js"
import { Circuit } from "./CircuitState.js"

const debugLogging = true
function logInfo(...args: any[]) { debugLogging && console.info('Function state:', ...args)}
function logError(...args: any[]) { console.error('Function state:', ...args)}

enum FunctionModificationType
{
    SetIOValue,
    SetIOFlags,
    SetIOFlag,
    SetInputRef,
    ChangeInputCount,
    ChangeOutputCount
}

interface FunctionModification
{
    type: FunctionModificationType
    ioNum?: number
    value?: number
    oldValue?: number
} 

type ChangeEventHandler = () => void
export type ValidatedEventHandler = (success: boolean) => void

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

    onIOUpdated:    ChangeEventHandler[] = []
    onStateUpdated: ChangeEventHandler

    onValidateValueModification:        ValidatedEventHandler[] = []
    onValidateFlagsModification:        ValidatedEventHandler[] = []
    onValidateInputRefModification:     ValidatedEventHandler[] = []

    modifications:  FunctionModification[] = []

    ////////////////////////////////////////////
    //      Updates from Controller
    ////////////////////////////////////////////

    updateIOValue(ioNum: number, value: number) {
        const currentValues = this.funcData.ioValues
        if (currentValues[ioNum] != value) {
            currentValues[ioNum] = value
            this.onIOUpdated[ioNum]?.()
        }
    }

    ////////////////////////////////////////////
    //        Modifications from UI
    ////////////////////////////////////////////
    
    // Store modifications to online function
    pushOnlineModification(type: FunctionModificationType, ioNum?: number) {
        logInfo('push modification', FunctionModificationType[type], this.offlineID, ioNum)
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
            if (this.onlineID) this.pushOnlineModification(FunctionModificationType.SetIOFlags, ioNum)
        }
    }
    setInputRef(ioNum: number, sourceBlockID: ID, sourceIONum: number) {
        this.funcData.inputRefs[ioNum] = (sourceBlockID != null) ? { id: sourceBlockID, ioNum: sourceIONum } : null
        
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

    // Connect to online controller
    connectOnline(cpu: IControllerInterface, onlineID: ID) {
        cpu.setFunctionBlockFlag(onlineID, FunctionFlag.MONITOR, true)
        this.cpu = cpu
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
    static async getOnlineData(cpu: IControllerInterface, id: ID) {
        const data = await cpu.getFunctionBlockData(id)
        return data
    }
}