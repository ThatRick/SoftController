import { MonitorValueChangeStruct } from '../Controller/ControllerDataTypes.js';
import { readArrayOfStructs } from '../Lib/TypedStructs.js';
import { FunctionBlock, FunctionModificationType } from './FunctionBlockState.js';
const debugLogging = true;
function logInfo(...args) { debugLogging && console.info('Circuit:', ...args); }
function logError(...args) { console.error('Circuit:', ...args); }
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
        this.blocksByOnlineDB = new Map();
        this.immediateMode = false;
        this.modifications = [];
        this.onValidateOutputRefModification = [];
        this.funcState = new FunctionBlock(funcData, -1);
        this.funcState.circuit = this;
        this.circuitData = circuitData;
    }
    get onlineDB() { return this.funcState.onlineDB; }
    get cpu() { return this.funcState.cpu; }
    connectOnline(cpu, onlineDB) {
        this.funcState.connectOnline(cpu, onlineDB);
        this.blocksByOnlineDB.set(onlineDB, this.funcState);
        cpu.setMonitoring(true);
        cpu.onEventReceived = this.receiveEvent.bind(this);
    }
    receiveEvent(event) {
        // logInfo('Event received:', event)
        switch (event.code) {
            case 0 /* MonitoringValues */:
                {
                    const buffer = event.data;
                    const updates = readArrayOfStructs(buffer, 0, MonitorValueChangeStruct);
                    updates.forEach(update => {
                        const func = this.blocksByOnlineDB.get(update.id);
                        func.updateIOValue(update.ioNum, update.value);
                    });
                }
        }
    }
    // Get block by ID
    getBlock(id) {
        return (id == -1) ? this.funcState : this.blocks[id];
    }
    getBlockCallIndex(id) {
        const index = this.circuitData.callIDList.findIndex(callID => (callID == id));
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
    pushOnlineModification(type, blockID, ioNum, onlineDB) {
        const modification = { type, blockID, ioNum, blockOnlineID: onlineDB };
        if (type == CircuitModificationType.DeleteFunction) {
            this.modifications = this.modifications.filter(modif => (modif.blockID != blockID));
        }
        if (this.immediateMode) {
            this.sendModification(modification);
        }
        else if (!this.modifications.find(existing => (existing.type == type && existing.blockID == blockID && existing.ioNum == ioNum))) {
            logInfo('Push online modification queue:', CircuitModificationType[type], modification);
            this.modifications.push(modification);
        }
    }
    addFunctionBlock(library, opcode, customInputCount, customOutputCount, callIndex) {
        const funcData = FunctionBlock.createNewData(library, opcode, customInputCount, customOutputCount);
        const id = this.blocks.length;
        const funcBlock = new FunctionBlock(funcData, id, this);
        this.blocks.push(funcBlock);
        callIndex ??= id;
        this.setBlockCallIndex(id, callIndex);
        if (this.onlineDB)
            this.pushOnlineModification(CircuitModificationType.AddFunction, id);
        return funcBlock;
    }
    deleteFunctionBlock(id) {
        const block = this.blocks[id];
        if (this.onlineDB && block.onlineDB)
            this.pushOnlineModification(CircuitModificationType.DeleteFunction, id, undefined, block.onlineDB);
        if (this.onlineDB && !block.onlineDB) {
            this.modifications = this.modifications.filter(modif => (modif.blockID != id));
        }
        this.blocksByOnlineDB.delete(block.onlineDB);
        delete this.blocks[id];
        this.circuitData.callIDList = this.circuitData.callIDList.filter(callID => callID != id);
        this.blocks.forEach(block => block.onStateUpdated?.());
    }
    setBlockCallIndex(id, newIndex) {
        const currentIndex = this.getBlockCallIndex(id);
        if (currentIndex == -1) {
            this.circuitData.callIDList.splice(newIndex, 0, id);
        }
        else {
            this.circuitData.callIDList.splice(newIndex, 0, this.circuitData.callIDList.splice(currentIndex, 1)[0]);
        }
        this.blocks.forEach(block => block.onStateUpdated?.());
        const block = this.getBlock(id);
        if (block?.onlineDB)
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
            logError('Could not send modifications: No online CPU connection');
            return;
        }
        for (const modification of this.modifications) {
            await this.sendModification(modification);
        }
        this.funcState.sendModifications();
        for (const block of this.blocks) {
            await block?.sendModifications();
        }
        this.modifications = [];
    }
    // Send circuit modification to online CPU
    async sendModification(modification) {
        const { blockID, ioNum, onlineDB: blockOnlineID } = modification;
        const block = this.getBlock(blockID);
        let success;
        let error;
        switch (modification.type) {
            case CircuitModificationType.AddFunction:
                {
                    const data = block.funcData;
                    const onlineID = await this.cpu.createFunctionBlock(data.library, data.opcode, this.onlineDB, this.getBlockCallIndex(block.id), data.inputCount, data.outputCount, data.staticCount).catch(e => error = e);
                    if (onlineID) {
                        block.connectOnline(this.cpu, onlineID);
                        this.blocksByOnlineDB.set(onlineID, block);
                        // send io values
                        for (const [ioNum, value] of block.funcData.ioValues.entries()) {
                            await this.cpu.setFunctionBlockIOValue(onlineID, ioNum, value);
                        }
                        // send input refs
                        // must append online modification of input ref to allow addition of possible new connection partner first
                        for (const [ioNum, ref] of block.funcData.inputRefs.entries()) {
                            ref && block.pushOnlineModification(FunctionModificationType.SetInputRef, ioNum);
                        }
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
                    success = await this.cpu.setFunctionCallIndex(this.onlineDB, block.onlineDB, index);
                    break;
                }
            case CircuitModificationType.SetOutputRef:
                {
                    const outputNum = ioNum - this.funcState.funcData.inputCount;
                    const connection = this.circuitData.outputRefs[outputNum];
                    const sourceOnlineID = (connection) ? this.getBlock(connection.id)?.onlineDB : null;
                    const sourceIONum = (connection) ? connection.ioNum : 0;
                    success = await this.cpu.connectCircuitOutput(this.onlineDB, outputNum, sourceOnlineID, sourceIONum).catch(e => error = e);
                    this.onValidateOutputRefModification[ioNum]?.(success);
                    break;
                }
        }
        logInfo('Sent modification:', CircuitModificationType[modification.type], modification, success);
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
            logError('Can not load online blocks. no online connections');
            return;
        }
        // Load circuit's function blocks from CPU
        this.blocks = await Promise.all(this.circuitData.callIDList.map(async (onlineID, id) => {
            // Create new function block with online data
            const data = await FunctionBlock.getOnlineData(this.cpu, onlineID);
            const block = new FunctionBlock(data, id, this);
            block.connectOnline(this.cpu, onlineID);
            // Store online DB reference for created function block
            this.blocksByOnlineDB.set(onlineID, block);
            // Convert call list references from online DB to block id
            this.circuitData.callIDList[id] = id;
            return block;
        }));
        // Convert circuit output references from online DBs to block IDs
        this.circuitData.outputRefs.forEach(ref => {
            if (ref)
                ref.id = this.blocksByOnlineDB.get(ref.id).id;
        });
        // Convert input references from online DBs to block IDs
        this.blocks.forEach(block => {
            block.funcData.inputRefs.forEach((ioRef, i, ioRefs) => {
                if (ioRef) {
                    const sourceBlock = this.blocksByOnlineDB.get(ioRef.id);
                    if (sourceBlock) {
                        // Change block reference form online to offline ID
                        ioRefs[i].id = sourceBlock.id;
                    }
                    else
                        logError('Connect function block input: source block undefined');
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
