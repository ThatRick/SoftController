import { getFunction } from '../FunctionCollection.js';
const debugLogging = true;
function logInfo(...args) { debugLogging && console.info('State:', ...args); }
function logError(...args) { console.error('State:', ...args); }
export var ModificationType;
(function (ModificationType) {
    ModificationType[ModificationType["ADD_BLOCK"] = 0] = "ADD_BLOCK";
    ModificationType[ModificationType["ADD_CIRCUIT_INPUT"] = 1] = "ADD_CIRCUIT_INPUT";
    ModificationType[ModificationType["ADD_CIRCUIT_OUTPUT"] = 2] = "ADD_CIRCUIT_OUTPUT";
    ModificationType[ModificationType["SET_IO_VALUE"] = 3] = "SET_IO_VALUE";
    ModificationType[ModificationType["CONNECT_FUNCTION_INPUT"] = 4] = "CONNECT_FUNCTION_INPUT";
    ModificationType[ModificationType["CONNECT_CIRCUIT_OUTPUT"] = 5] = "CONNECT_CIRCUIT_OUTPUT";
    ModificationType[ModificationType["DELETE_BLOCK"] = 6] = "DELETE_BLOCK";
    ModificationType[ModificationType["DELETE_CIRCUIT_INPUT"] = 7] = "DELETE_CIRCUIT_INPUT";
    ModificationType[ModificationType["DELETE_CIRCUIT_OUTPUT"] = 8] = "DELETE_CIRCUIT_OUTPUT";
    ModificationType[ModificationType["DELETE_CONNECTION"] = 9] = "DELETE_CONNECTION";
})(ModificationType || (ModificationType = {}));
///////////////////////////////
//      Function Block
///////////////////////////////
export class FunctionBlock {
    constructor(funcData, offlineID) {
        this.funcData = funcData;
        this.offlineID = offlineID;
        this.onIOChanged = [];
        this.isCircuit = (funcData.library == 0);
        this.func = (this.isCircuit) ? null : getFunction(funcData.library, funcData.opcode);
    }
    connectOnline(onlineID) {
        this.onlineID = onlineID;
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
    static async readOnlineData(cpu, id) {
        const data = await cpu.getFunctionBlockData(id);
        return data;
    }
}
///////////////////////////////
//          Circuit
///////////////////////////////
export class Circuit extends FunctionBlock {
    constructor(funcData, circuitData) {
        super(funcData, -1);
        this.blocks = [];
        this.blocksByOnlineID = new Map();
        this.modifications = [];
        this.immediateMode = false;
        this.circuitData = circuitData;
    }
    modified(type, blockID, ioNum) {
        this.modifications.push({ type, blockID, ioNum });
        if (this.immediateMode)
            this.sendChanges();
    }
    getBlock(offlineID) {
        return (offlineID == -1) ? this : this.blocks[offlineID];
    }
    ////////////////////////////
    //      Modifications
    ////////////////////////////
    setIOValue(blockID, ioNum, value, isOnlineReadback = false) {
        const block = this.getBlock(blockID);
        const currentValues = block.funcData.ioValues;
        if (currentValues[ioNum] != value) {
            currentValues[ioNum] = value;
            block.onIOChanged[ioNum]?.();
            if (this.cpu && !isOnlineReadback)
                this.modified(ModificationType.SET_IO_VALUE, blockID, ioNum);
        }
    }
    addFunctionBlock(library, opcode, customInputCount, customOutputCount, callIndex) {
        const funcData = FunctionBlock.createNewData(library, opcode, customInputCount, customOutputCount);
        const offlineID = this.blocks.length;
        const funcBlock = new FunctionBlock(funcData, offlineID);
        this.blocks.push(funcBlock);
        funcBlock.parentCircuit = this;
        if (this.cpu)
            this.modified(ModificationType.ADD_BLOCK, offlineID);
        return funcBlock;
    }
    connectFunctionBlockInput(targetBlockID, targetInputNum, sourceBlockID, sourceIONum, inverted = false) {
        const targetBlock = this.getBlock(targetBlockID);
        targetBlock.funcData.inputRefs[targetInputNum] = { id: sourceBlockID, ioNum: sourceIONum };
        if (this.cpu)
            this.modified(ModificationType.CONNECT_FUNCTION_INPUT, targetBlock.offlineID, targetInputNum);
    }
    disconnectFunctionBlockInput(blockID, inputNum) {
        const targetBlock = this.getBlock(blockID);
        targetBlock.funcData.inputRefs[inputNum] = undefined;
        if (this.cpu)
            this.modified(ModificationType.DELETE_CONNECTION, targetBlock.offlineID, inputNum);
    }
    // Read IO values from online CPU
    async readOnlineValues() {
        if (!this.cpu)
            return;
        await this.readOnlineBlockIOValues(this.offlineID);
        for (const block of this.blocks) {
            this.readOnlineBlockIOValues(block.offlineID);
        }
    }
    async readOnlineBlockIOValues(blockID) {
        const block = this.getBlock(blockID);
        const ioValues = await this.cpu.getFunctionBlockIOValues(block.onlineID);
        ioValues.forEach((onlineValue, ioNum) => {
            this.setIOValue(blockID, ioNum, onlineValue, true);
        });
    }
    // Load function blocks from online CPU
    async readOnlineFunctionBlocks() {
        if (!this.cpu) {
            console.error('Circuit: Can not load online blocks. no controller connected');
            return;
        }
        // Set self to online blocks for connecting circuit inputs to block IO
        this.blocksByOnlineID.set(this.onlineID, this);
        // Get first free offline ID
        let offlineID = this.blocks.length;
        // Load circuit's function blocks from CPU
        this.blocks = await Promise.all(this.circuitData.callIDList.map(async (onlineID) => {
            const data = await FunctionBlock.readOnlineData(this.cpu, onlineID);
            const block = new FunctionBlock(data, offlineID++);
            block.connectOnline(onlineID);
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
    setImmediateMode(state) {
        this.immediateMode = state;
        logInfo('immediate mode', this.immediateMode);
        return this.immediateMode;
    }
    async sendChanges() {
        if (!this.cpu) {
            console.error('Upload changes: No online CPU connection');
            return;
        }
        for (const modification of this.modifications.values()) {
            await this.sendModification(modification.type, modification.blockID, modification.ioNum);
        }
        this.modifications = [];
        await this.cpu.stepController(20);
        this.readOnlineValues();
    }
    async sendModification(type, blockOfflineID, ioNum) {
        let success;
        let error;
        switch (type) {
            case ModificationType.SET_IO_VALUE:
                {
                    const block = (blockOfflineID == -1) ? this : this.blocks[blockOfflineID];
                    const value = block.funcData.ioValues[ioNum];
                    success = await this.cpu.setFunctionBlockIOValue(block.onlineID, ioNum, value);
                    break;
                }
            case ModificationType.ADD_BLOCK:
                {
                    const block = this.blocks[blockOfflineID];
                    const data = block.funcData;
                    const onlineID = await this.cpu.createFunctionBlock(data.library, data.opcode, this.onlineID, undefined, data.inputCount, data.outputCount, data.staticCount).catch(e => error = e);
                    if (onlineID) {
                        block.connectOnline(onlineID);
                        success = true;
                    }
                    break;
                }
            case ModificationType.CONNECT_FUNCTION_INPUT:
                {
                    const targetBlock = this.blocks[blockOfflineID];
                    const connection = targetBlock.funcData.inputRefs[ioNum];
                    const sourceBlock = (connection.id == -1) ? this : this.blocks[connection.id];
                    const targetOnlineID = targetBlock.onlineID;
                    const sourceOnlineID = sourceBlock.onlineID;
                    if (!targetOnlineID || !sourceOnlineID) {
                        error = 'Invalid source of target block ID';
                        break;
                    }
                    success = await this.cpu.connectFunctionBlockInput(targetOnlineID, ioNum, sourceOnlineID, connection.ioNum).catch(e => error = e);
                    break;
                }
            case ModificationType.DELETE_CONNECTION:
                {
                    const targetBlock = this.blocks[blockOfflineID];
                    success = await this.cpu.connectFunctionBlockInput(targetBlock.onlineID, ioNum, 0, 0).catch(e => error = e);
                }
        }
        logInfo('Modification result:', { type: ModificationType[type], success, blockOfflineID, ioNum });
        this.onModificationUploaded?.(type, success, blockOfflineID, ioNum);
        return success;
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
    static async loadOnline(cpu, circuitOnlineID, loadBlocks = true) {
        const funcData = await cpu.getFunctionBlockData(circuitOnlineID);
        const circuitData = await cpu.getCircuitData(circuitOnlineID);
        const circuit = new Circuit(funcData, circuitData);
        circuit.cpu = cpu;
        circuit.connectOnline(circuitOnlineID);
        if (loadBlocks)
            await circuit.readOnlineFunctionBlocks();
        return circuit;
    }
}
