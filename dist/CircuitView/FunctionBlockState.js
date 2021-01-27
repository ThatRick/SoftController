import { instructions } from "../Controller/ControllerInterface.js";
const debugLogging = true;
function logInfo(...args) { debugLogging && console.info('Function state:', ...args); }
function logError(...args) { console.error('Function state:', ...args); }
var FunctionModificationType;
(function (FunctionModificationType) {
    FunctionModificationType[FunctionModificationType["SetIOValue"] = 0] = "SetIOValue";
    FunctionModificationType[FunctionModificationType["SetIOFlags"] = 1] = "SetIOFlags";
    FunctionModificationType[FunctionModificationType["SetIOFlag"] = 2] = "SetIOFlag";
    FunctionModificationType[FunctionModificationType["SetInputRef"] = 3] = "SetInputRef";
    FunctionModificationType[FunctionModificationType["ChangeInputCount"] = 4] = "ChangeInputCount";
    FunctionModificationType[FunctionModificationType["ChangeOutputCount"] = 5] = "ChangeOutputCount";
})(FunctionModificationType || (FunctionModificationType = {}));
///////////////////////////////
//      Function Block
///////////////////////////////
export class FunctionBlock {
    constructor(funcData, offlineID, parentCircuit) {
        this.funcData = funcData;
        this.offlineID = offlineID;
        this.onIOUpdated = [];
        this.onValidateValueModification = [];
        this.onValidateFlagsModification = [];
        this.onValidateInputRefModification = [];
        this.modifications = [];
        this.isCircuit = (funcData.library == 0);
        this.func = (this.isCircuit) ? null : instructions.getFunction(funcData.library, funcData.opcode);
        this.parentCircuit = parentCircuit;
    }
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
        logInfo('push modification', FunctionModificationType[type], this.offlineID, ioNum);
        const modification = { type, ioNum };
        if (this.parentCircuit?.immediateMode || this.circuit?.immediateMode) {
            this.sendModification(modification);
        }
        else if (!this.modifications.find(existing => (existing.type == type && existing.ioNum == ioNum))) {
            this.modifications.push(modification);
        }
    }
    setIOValue(ioNum, value) {
        const currentValues = this.funcData.ioValues;
        if (currentValues[ioNum] != value) {
            currentValues[ioNum] = value;
            if (this.onlineID)
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
            if (this.onlineID)
                this.pushOnlineModification(FunctionModificationType.SetIOFlags, ioNum);
        }
    }
    setInputRef(ioNum, sourceBlockID, sourceIONum) {
        this.funcData.inputRefs[ioNum] = (sourceBlockID != null) ? { id: sourceBlockID, ioNum: sourceIONum } : null;
        if (this.cpu)
            this.pushOnlineModification(FunctionModificationType.SetInputRef, ioNum);
    }
    deleteFunction() {
        this.parentCircuit.deleteFunctionBlock(this.offlineID);
    }
    changeInputCount() { }
    changeOutputCount() { }
    ///////////////////////
    // Read function block IO values from online CPU
    async updateOnlineValues() {
        const ioValues = await this.cpu.getFunctionBlockIOValues(this.onlineID);
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
                    success = await this.cpu.setFunctionBlockIOValue(this.onlineID, ioNum, value);
                    this.onValidateValueModification[ioNum]?.(success);
                    break;
                }
            case FunctionModificationType.SetIOFlags:
                {
                    const flags = this.funcData.ioFlags[ioNum];
                    success = await this.cpu.setFunctionBlockIOFlags(this.onlineID, ioNum, flags);
                    this.onValidateFlagsModification[ioNum]?.(success);
                    break;
                }
            case FunctionModificationType.SetInputRef:
                {
                    const connection = this.funcData.inputRefs[ioNum];
                    const sourceOnlineID = (connection) ? this.parentCircuit.getBlock(connection.id)?.onlineID : null;
                    const sourceIONum = (connection) ? connection.ioNum : 0;
                    success = await this.cpu.connectFunctionBlockInput(this.onlineID, ioNum, sourceOnlineID, sourceIONum)
                        .catch(e => error = e);
                    this.onValidateInputRefModification[ioNum]?.(success);
                    break;
                }
        }
        logInfo('Modification result:', { modification, success, id: this.offlineID, ioNum });
        return success;
    }
    // Connect to online controller
    connectOnline(cpu, onlineID) {
        cpu.setFunctionBlockFlag(onlineID, 1 /* MONITOR */, true);
        this.cpu = cpu;
        this.onlineID = onlineID;
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
        function stretchArray(arr, length) {
            while (arr.length < length)
                arr.push(arr[arr.length - 1]);
            while (arr.length > length)
                arr.pop();
            return arr;
        }
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
    static async getOnlineData(cpu, id) {
        const data = await cpu.getFunctionBlockData(id);
        return data;
    }
}
