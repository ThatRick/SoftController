import { instructions } from "../Controller/ControllerInterface.js";
const debugLogging = true;
function logInfo(...args) { debugLogging && console.info('Function', ...args); }
function logError(...args) { console.error('Function', ...args); }
export var FunctionModificationType;
(function (FunctionModificationType) {
    FunctionModificationType[FunctionModificationType["SetIOValue"] = 0] = "SetIOValue";
    FunctionModificationType[FunctionModificationType["SetIOFlags"] = 1] = "SetIOFlags";
    FunctionModificationType[FunctionModificationType["SetIOFlag"] = 2] = "SetIOFlag";
    FunctionModificationType[FunctionModificationType["SetInputRef"] = 3] = "SetInputRef";
    FunctionModificationType[FunctionModificationType["SetInputCount"] = 4] = "SetInputCount";
    FunctionModificationType[FunctionModificationType["SetOutputCount"] = 5] = "SetOutputCount";
})(FunctionModificationType || (FunctionModificationType = {}));
///////////////////////////////
//      Function Block
///////////////////////////////
export class FunctionBlock {
    funcData;
    id;
    constructor(funcData, id, parentCircuit) {
        this.funcData = funcData;
        this.id = id;
        this.isCircuit = (funcData.library == 0);
        this.func = (this.isCircuit) ? null : instructions.getFunction(funcData.library, funcData.opcode);
        this.parentCircuit = parentCircuit;
    }
    func;
    isCircuit;
    circuit;
    parentCircuit;
    cpu;
    onlineDB;
    onIOUpdated = [];
    onStateUpdated;
    onValidateValueModification = [];
    onValidateFlagsModification = [];
    onValidateInputRefModification = [];
    modifications = [];
    ////////////////////////////////////////////
    //      Updates from Controller
    ////////////////////////////////////////////
    updateIOValue(ioNum, value) {
        const currentValues = this.funcData.ioValues;
        if (currentValues[ioNum] != value) {
            currentValues[ioNum] = value;
            this.onIOUpdated[ioNum]?.();
        }
    }
    ////////////////////////////////////////////
    //        Modifications from UI
    ////////////////////////////////////////////
    // Store modifications to online function
    pushOnlineModification(type, ioNum) {
        const modification = { type, ioNum };
        if (this.parentCircuit?.immediateMode || this.circuit?.immediateMode) {
            this.sendModification(modification);
        }
        else if (!this.modifications.find(existing => (existing.type == type && existing.ioNum == ioNum))) {
            logInfo(this.id, 'Push online modification queue:', FunctionModificationType[type], modification);
            this.modifications.push(modification);
        }
    }
    setIOValue(ioNum, value) {
        const currentValues = this.funcData.ioValues;
        if (currentValues[ioNum] != value) {
            currentValues[ioNum] = value;
            if (this.onlineDB)
                this.pushOnlineModification(FunctionModificationType.SetIOValue, ioNum);
        }
    }
    setIOFlag(ioNum, flag, setEnabled) {
        const currentFlags = this.funcData.ioFlags[ioNum];
        const flags = (setEnabled)
            ? currentFlags | flag
            : currentFlags & ~flag;
        this.setIOFlags(ioNum, flags);
    }
    setIOFlags(ioNum, flags) {
        const currentFlags = this.funcData.ioFlags;
        if (currentFlags[ioNum] != flags) {
            currentFlags[ioNum] = flags;
            if (this.onlineDB)
                this.pushOnlineModification(FunctionModificationType.SetIOFlags, ioNum);
        }
    }
    setInputRef(ioNum, sourceBlockID, sourceIONum) {
        this.funcData.inputRefs[ioNum] = (sourceBlockID != null) ? { id: sourceBlockID, ioNum: sourceIONum } : null;
        if (this.cpu)
            this.pushOnlineModification(FunctionModificationType.SetInputRef, ioNum);
    }
    setInputCount(inputCount) {
        const func = this.func;
        if (this.isCircuit || (func.variableInputCount && inputCount <= func.variableInputCount.max && inputCount >= func.variableInputCount.min)) {
            const change = inputCount - this.funcData.inputCount;
            const currentLastInputIndex = this.funcData.inputCount;
            if (change > 0) {
                const values = new Array(change).fill(this.funcData.ioValues[currentLastInputIndex]);
                const flags = new Array(change).fill(this.funcData.ioFlags[currentLastInputIndex]);
                this.funcData.ioValues.splice(currentLastInputIndex, 0, ...values);
                this.funcData.ioFlags.splice(currentLastInputIndex, 0, ...flags);
            }
            else if (change < 0) {
                this.funcData.ioValues.splice(currentLastInputIndex, Math.abs(change));
            }
            this.funcData.inputCount = inputCount;
        }
        // Must change all output references after input count change
        if (this.cpu)
            this.pushOnlineModification(FunctionModificationType.SetInputCount);
    }
    setOutputCount(count) { }
    deleteFunction() {
        this.parentCircuit.deleteFunctionBlock(this.id);
    }
    ///////////////////////
    // Read function block IO values from online CPU
    async updateOnlineValues() {
        const ioValues = await this.cpu.getFunctionBlockIOValues(this.onlineDB);
        ioValues.forEach((onlineValue, ioNum) => {
            this.updateIOValue(ioNum, onlineValue);
        });
    }
    // Send all function online modifications
    async sendModifications() {
        for (const modification of this.modifications) {
            await this.sendModification(modification);
        }
        this.modifications = [];
    }
    // Send function modification to online CPU
    async sendModification(modification) {
        const ioNum = modification.ioNum;
        let success;
        let error;
        switch (modification.type) {
            case FunctionModificationType.SetIOValue:
                {
                    const value = this.funcData.ioValues[ioNum];
                    success = await this.cpu.setFunctionBlockIOValue(this.onlineDB, ioNum, value);
                    this.onValidateValueModification[ioNum]?.(success);
                    break;
                }
            case FunctionModificationType.SetIOFlags:
                {
                    const flags = this.funcData.ioFlags[ioNum];
                    success = await this.cpu.setFunctionBlockIOFlags(this.onlineDB, ioNum, flags);
                    this.onValidateFlagsModification[ioNum]?.(success);
                    break;
                }
            case FunctionModificationType.SetInputRef:
                {
                    const connection = this.funcData.inputRefs[ioNum];
                    const sourceOnlineID = (connection) ? this.parentCircuit.getBlock(connection.id)?.onlineDB : null;
                    const sourceIONum = (connection) ? connection.ioNum : 0;
                    success = await this.cpu.connectFunctionBlockInput(this.onlineDB, ioNum, sourceOnlineID, sourceIONum)
                        .catch(e => error = e);
                    this.onValidateInputRefModification[ioNum]?.(success);
                    break;
                }
        }
        logInfo(this.id, 'Sent modification:', FunctionModificationType[modification.type], modification, success);
        return success;
    }
    // Connect to online controller
    connectOnline(cpu, onlineDB) {
        cpu.setFunctionBlockFlag(onlineDB, 1 /* MONITOR */, true);
        this.cpu = cpu;
        this.onlineDB = onlineDB;
        this.onStateUpdated?.();
    }
    // Create new offline function block data
    static createNewData(library, opcode, customInputCount, customOutputCount) {
        const func = instructions.getFunction(library, opcode);
        if (!func) {
            console.error('Invalid function library/opcode');
            return;
        }
        const inputCount = (customInputCount && func.variableInputCount &&
            customInputCount <= func.variableInputCount.max && customInputCount >= func.variableInputCount.min) ? customInputCount : func.inputs.length;
        const outputCount = (customOutputCount && func.variableOutputCount &&
            customOutputCount <= func.variableInputCount.max && customOutputCount >= func.variableOutputCount.min) ? customOutputCount : func.outputs.length;
        const inputValues = stretchArray(func.inputs.map(input => input.initValue), inputCount);
        const inputFlags = stretchArray(func.inputs.map(input => input.flags), inputCount);
        const outputValues = stretchArray(func.outputs.map(output => output.initValue), outputCount);
        const outputFlags = stretchArray(func.outputs.map(output => output.flags), outputCount);
        const data = {
            library,
            opcode,
            inputCount,
            outputCount,
            staticCount: func.staticCount,
            functionFlags: 0,
            ioValues: [...inputValues, ...outputValues],
            ioFlags: [...inputFlags, ...outputFlags],
            inputRefs: []
        };
        return data;
    }
    // Download online function block data
    static async getOnlineData(cpu, db) {
        const data = await cpu.getFunctionBlockData(db);
        return data;
    }
}
function stretchArray(arr, length) {
    while (arr.length < length)
        arr.push(arr[arr.length - 1]);
    while (arr.length > length)
        arr.pop();
    return arr;
}
