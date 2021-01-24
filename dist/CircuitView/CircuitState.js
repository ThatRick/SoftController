import { getFunction } from '../FunctionCollection.js';
import { MonitorValueChangeStruct } from '../Controller/ControllerDataTypes.js';
import { readArrayOfStructs } from '../Lib/TypedStructs.js';
const debugLogging = true;
function logInfo(...args) { debugLogging && console.info('State:', ...args); }
function logError(...args) { console.error('State:', ...args); }
var FunctionModificationType;
(function (FunctionModificationType) {
    FunctionModificationType[FunctionModificationType["SetIOValue"] = 0] = "SetIOValue";
    FunctionModificationType[FunctionModificationType["SetIOFlags"] = 1] = "SetIOFlags";
    FunctionModificationType[FunctionModificationType["SetIOFlag"] = 2] = "SetIOFlag";
    FunctionModificationType[FunctionModificationType["SetInputRef"] = 3] = "SetInputRef";
    FunctionModificationType[FunctionModificationType["ChangeInputCount"] = 4] = "ChangeInputCount";
    FunctionModificationType[FunctionModificationType["ChangeOutputCount"] = 5] = "ChangeOutputCount";
})(FunctionModificationType || (FunctionModificationType = {}));
var CircuitModificationType;
(function (CircuitModificationType) {
    CircuitModificationType[CircuitModificationType["AddFunction"] = 0] = "AddFunction";
    CircuitModificationType[CircuitModificationType["DeleteFunction"] = 1] = "DeleteFunction";
    CircuitModificationType[CircuitModificationType["ReorderFunctionCall"] = 2] = "ReorderFunctionCall";
    CircuitModificationType[CircuitModificationType["SetOutputRef"] = 3] = "SetOutputRef";
})(CircuitModificationType || (CircuitModificationType = {}));
///////////////////////////////
//      Function Block
///////////////////////////////
export class FunctionBlock {
    constructor(funcData, offlineID, parentCircuit) {
        this.funcData = funcData;
        this.offlineID = offlineID;
        this.onIOUpdate = [];
        this.onValidateValueModification = [];
        this.onValidateFlagsModification = [];
        this.onValidateInputRefModification = [];
        this.modifications = [];
        this.isCircuit = (funcData.library == 0);
        this.func = (this.isCircuit) ? null : getFunction(funcData.library, funcData.opcode);
        this.parentCircuit = parentCircuit;
    }
    connectOnline(cpu, onlineID) {
        cpu.setFunctionBlockFlag(onlineID, 1 /* MONITOR */, true);
        this.cpu = cpu;
        this.onlineID = onlineID;
    }
    ////////////////////////////////////////////
    //      Updates from Controller
    ////////////////////////////////////////////
    updateIOValue(ioNum, value) {
        const currentValues = this.funcData.ioValues;
        if (currentValues[ioNum] != value) {
            currentValues[ioNum] = value;
            this.onIOUpdate[ioNum]?.();
        }
    }
    ////////////////////////////////////////////
    //        Modifications from UI
    ////////////////////////////////////////////
    // Store modifications to online function
    pushOnlineModification(type, ioNum) {
        logInfo('Online Function Modification', FunctionModificationType[type], this.offlineID, ioNum);
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
                this.pushOnlineModification(FunctionModificationType.SetIOValue, ioNum);
        }
    }
    setInputRef(ioNum, sourceBlockID, sourceIONum) {
        this.funcData.inputRefs[ioNum] = (sourceBlockID) ? { id: sourceBlockID, ioNum: sourceIONum } : null;
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
    // Create new offline function block data
    static createNewData(library, opcode, customInputCount, customOutputCount) {
        const func = getFunction(library, opcode);
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
    static async readFuncBlockDataFromOnlineCPU(cpu, id) {
        const data = await cpu.getFunctionBlockData(id);
        return data;
    }
}
///////////////////////////////
//          Circuit
///////////////////////////////
export class Circuit {
    constructor(funcData, circuitData) {
        this.blocks = [];
        this.blocksByOnlineID = new Map();
        this.immediateMode = false;
        this.modifications = [];
        this.funcState = new FunctionBlock(funcData, -1);
        this.funcState.circuit = this;
        this.circuitData = circuitData;
    }
    get onlineID() { return this.funcState.onlineID; }
    get cpu() { return this.funcState.cpu; }
    connectOnline(cpu, onlineID) {
        this.funcState.connectOnline(cpu, onlineID);
        this.blocksByOnlineID.set(onlineID, this.funcState);
        cpu.setMonitoring(true);
        cpu.onEventReceived = this.receiveEvent.bind(this);
    }
    receiveEvent(event) {
        logInfo('Event received:', event);
        switch (event.code) {
            case 0 /* MonitoringValues */:
                {
                    const buffer = event.data;
                    const updates = readArrayOfStructs(buffer, 0, MonitorValueChangeStruct);
                    updates.forEach(update => {
                        const func = this.blocksByOnlineID.get(update.id);
                        func.updateIOValue(update.ioNum, update.value);
                    });
                }
        }
    }
    // Get block by ID
    getBlock(offlineID) {
        return (offlineID == -1) ? this.funcState : this.blocks[offlineID];
    }
    ////////////////////////////
    //      Modifications
    ////////////////////////////
    // In immediate mode online modifications are sent to CPU immediately
    setImmediateMode(state) {
        this.immediateMode = state;
        return this.immediateMode;
    }
    // Store circuit modifications
    pushOnlineModification(type, blockID, ioNum, blockOnlineID) {
        logInfo('Modification', CircuitModificationType[type], blockID, ioNum);
        const modification = { type, blockID, ioNum, blockOnlineID };
        if (type == CircuitModificationType.DeleteFunction) {
        }
        if (this.immediateMode) {
            this.sendModification(modification);
        }
        else if (!this.modifications.find(existing => (existing.type == type && existing.blockID == blockID && existing.ioNum == ioNum))) {
            this.modifications.push(modification);
        }
    }
    addFunctionBlock(library, opcode, customInputCount, customOutputCount, callIndex) {
        const funcData = FunctionBlock.createNewData(library, opcode, customInputCount, customOutputCount);
        const offlineID = this.blocks.length;
        const funcBlock = new FunctionBlock(funcData, offlineID, this);
        this.blocks.push(funcBlock);
        funcBlock.parentCircuit = this;
        if (this.onlineID)
            this.pushOnlineModification(CircuitModificationType.AddFunction, offlineID);
        return funcBlock;
    }
    deleteFunctionBlock(id) {
        const block = this.blocks[id];
        if (this.onlineID)
            this.pushOnlineModification(CircuitModificationType.DeleteFunction, id, undefined, block.onlineID);
        this.blocksByOnlineID.delete(block.onlineID);
        delete this.blocks[id];
        this.circuitData.callIDList = this.circuitData.callIDList.filter(callID => callID != id);
    }
    setOutputRef(ioNum, sourceBlockID, sourceIONum) {
        const outputNum = ioNum - this.funcState.funcData.inputCount;
        this.circuitData.outputRefs[outputNum] = (sourceBlockID) ? { id: sourceBlockID, ioNum: sourceIONum } : null;
        if (this.cpu)
            this.pushOnlineModification(CircuitModificationType.SetOutputRef, null, ioNum);
    }
    // Send circuit modifications to online CPU
    async sendModifications() {
        if (!this.cpu) {
            console.error('Upload changes: No online CPU connection');
            return;
        }
        for (const block of this.blocks) {
            await block?.sendModifications();
        }
        for (const modification of this.modifications) {
            await this.sendModification(modification);
        }
        this.modifications = [];
    }
    // Send circuit modification to online CPU
    async sendModification(modification) {
        const { blockID, ioNum, blockOnlineID } = modification;
        const block = this.getBlock(blockID);
        let success;
        let error;
        switch (modification.type) {
            case CircuitModificationType.AddFunction:
                {
                    const data = block.funcData;
                    const onlineID = await this.cpu.createFunctionBlock(data.library, data.opcode, this.onlineID, undefined, data.inputCount, data.outputCount, data.staticCount).catch(e => error = e);
                    if (onlineID) {
                        block.connectOnline(this.cpu, onlineID);
                        success = true;
                    }
                    break;
                }
            case CircuitModificationType.DeleteFunction:
                {
                    success = await this.cpu.deleteFunctionBlock(blockOnlineID);
                    break;
                }
            case CircuitModificationType.SetOutputRef:
                {
                    const outputNum = ioNum - this.funcState.funcData.inputCount;
                    const connection = this.circuitData.outputRefs[outputNum];
                    const sourceOnlineID = (connection) ? this.getBlock(connection.id)?.onlineID : null;
                    const sourceIONum = (connection) ? connection.ioNum : 0;
                    success = await this.cpu.connectCircuitOutput(this.onlineID, outputNum, sourceOnlineID, sourceIONum).catch(e => error = e);
                    break;
                }
        }
        logInfo('Modification result:', { type: CircuitModificationType[modification.type], success, blockOfflineID: blockID, ioNum });
        this.onOnlineModificationDone?.(modification, success);
        return success;
    }
    ///////////////////////////////
    //      Online functions
    ///////////////////////////////
    // Read circuit and it's blocks IO values from online CPU
    async getOnlineValues() {
        if (!this.cpu)
            return;
        await this.funcState.updateOnlineValues();
        this.blocks.forEach(block => {
            block.updateOnlineValues();
        });
    }
    // Load function blocks from online CPU
    async getOnlineFunctionBlocks() {
        if (!this.cpu) {
            console.error('Circuit: Can not load online blocks. no controller connected');
            return;
        }
        // Get first free offline ID
        let offlineID = this.blocks.length;
        // Load circuit's function blocks from CPU
        this.blocks = await Promise.all(this.circuitData.callIDList.map(async (onlineID) => {
            const data = await FunctionBlock.readFuncBlockDataFromOnlineCPU(this.cpu, onlineID);
            const block = new FunctionBlock(data, offlineID++, this);
            block.connectOnline(this.cpu, onlineID);
            this.blocksByOnlineID.set(onlineID, block);
            return block;
        }));
        // Connect loaded function blocks
        this.blocks.forEach(block => {
            block.funcData.inputRefs.forEach((ioRef, i, ioRefs) => {
                if (ioRef) {
                    const sourceBlock = this.blocksByOnlineID.get(ioRef.id);
                    if (sourceBlock) {
                        // Change block reference form online to offline ID
                        ioRefs[i].id = sourceBlock.offlineID;
                    }
                    else
                        console.error('Connect: source block undefined');
                }
            });
        });
    }
    ///////////////////////////////
    //      STATIC FUNCTIONS
    ///////////////////////////////
    // Create new empty circuit
    static createNew() {
        const funcData = {
            library: 0,
            opcode: 0,
            inputCount: 0,
            outputCount: 0,
            staticCount: 0,
            functionFlags: 0,
            ioValues: [],
            ioFlags: [],
            inputRefs: []
        };
        const circuitData = {
            callIDList: [],
            outputRefs: []
        };
        return new Circuit(funcData, circuitData);
    }
    // Download circuit from online CPU
    static async getOnlineCircuit(cpu, circuitOnlineID, loadBlocks = true) {
        const funcData = await cpu.getFunctionBlockData(circuitOnlineID);
        const circuitData = await cpu.getCircuitData(circuitOnlineID);
        const circuit = new Circuit(funcData, circuitData);
        circuit.connectOnline(cpu, circuitOnlineID);
        if (loadBlocks)
            await circuit.getOnlineFunctionBlocks();
        return circuit;
    }
}
