import { MonitorValueChangeStruct } from '../Controller/ControllerDataTypes.js';
import { readArrayOfStructs } from '../Lib/TypedStructs.js';
import { FunctionBlock } from './FunctionBlockState.js';
const debugLogging = true;
function logInfo(...args) { debugLogging && console.info('State:', ...args); }
function logError(...args) { console.error('State:', ...args); }
var CircuitModificationType;
(function (CircuitModificationType) {
    CircuitModificationType[CircuitModificationType["AddFunction"] = 0] = "AddFunction";
    CircuitModificationType[CircuitModificationType["DeleteFunction"] = 1] = "DeleteFunction";
    CircuitModificationType[CircuitModificationType["SetBlockCallIndex"] = 2] = "SetBlockCallIndex";
    CircuitModificationType[CircuitModificationType["SetOutputRef"] = 3] = "SetOutputRef";
})(CircuitModificationType || (CircuitModificationType = {}));
///////////////////////////////
//          Circuit
///////////////////////////////
export class Circuit {
    constructor(funcData, circuitData) {
        this.blocks = [];
        this.blocksByOnlineID = new Map();
        this.immediateMode = false;
        this.modifications = [];
        this.onValidateOutputRefModification = [];
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
    getBlockCallIndex(offlineID) {
        const index = this.circuitData.callIDList.findIndex(callID => (callID == offlineID));
        console.log('get call index', offlineID, index);
        return index;
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
            this.modifications = this.modifications.filter(modif => (modif.blockID != blockID));
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
        callIndex ??= offlineID;
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
    setBlockCallIndex(id, newIndex) {
        const currentIndex = this.getBlockCallIndex(id);
        if (currentIndex == -1) {
            this.circuitData.callIDList.splice(newIndex, 0, id);
        }
        else {
            this.circuitData.callIDList.splice(newIndex, 0, this.circuitData.callIDList.splice(currentIndex, 1)[0]);
        }
        if (this.cpu)
            this.pushOnlineModification(CircuitModificationType.SetBlockCallIndex, id);
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
                    const onlineID = await this.cpu.createFunctionBlock(data.library, data.opcode, this.onlineID, this.getBlockCallIndex(block.offlineID), data.inputCount, data.outputCount, data.staticCount).catch(e => error = e);
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
            case CircuitModificationType.SetBlockCallIndex:
                {
                    const index = this.getBlockCallIndex(blockID);
                    success = await this.cpu.setFunctionCallIndex(this.onlineID, block.onlineID, index);
                    break;
                }
            case CircuitModificationType.SetOutputRef:
                {
                    const outputNum = ioNum - this.funcState.funcData.inputCount;
                    const connection = this.circuitData.outputRefs[outputNum];
                    const sourceOnlineID = (connection) ? this.getBlock(connection.id)?.onlineID : null;
                    const sourceIONum = (connection) ? connection.ioNum : 0;
                    success = await this.cpu.connectCircuitOutput(this.onlineID, outputNum, sourceOnlineID, sourceIONum).catch(e => error = e);
                    this.onValidateOutputRefModification[ioNum]?.(success);
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
        // Load circuit's function blocks from CPU
        this.blocks = await Promise.all(this.circuitData.callIDList.map(async (onlineID, offlineID) => {
            // Create new function block with online data
            const data = await FunctionBlock.getOnlineData(this.cpu, onlineID);
            const block = new FunctionBlock(data, offlineID, this);
            block.connectOnline(this.cpu, onlineID);
            // Store onlineID reference for created function block
            this.blocksByOnlineID.set(onlineID, block);
            // Convert call list references from onlineID to offlineID
            this.circuitData.callIDList[offlineID] = offlineID;
            console.log('callList', offlineID);
            return block;
        }));
        // Convert circuit output references from online to offline IDs
        this.circuitData.outputRefs.forEach(ref => {
            if (ref)
                ref.id = this.blocksByOnlineID.get(ref.id).offlineID;
        });
        // Convert input references from online to offline IDs
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
