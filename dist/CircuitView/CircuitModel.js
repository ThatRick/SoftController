import { getFunction } from '../FunctionCollection.js';
import { getIOType } from '../Controller/ControllerDataTypes.js';
///////////////////////////////
//            IO
///////////////////////////////
export class FunctionBlockIO {
    constructor(funcBlock, ioNum, name, pinType, isCircuitIO = false) {
        this.funcBlock = funcBlock;
        this.ioNum = ioNum;
        this.pinType = pinType;
        this.isCircuitIO = isCircuitIO;
        this._name = name;
    }
    get name() { return this._name; }
    get dataType() { return getIOType(this.flags); }
    get flags() { return this.funcBlock.funcData.ioFlags[this.ioNum]; }
    get value() { return this.funcBlock.funcData.ioValues[this.ioNum]; }
    get id() { return FunctionBlockIO.ID(this.funcBlock.offlineID, this.ioNum); }
    setValue(value) {
        this.funcBlock.setIOValue(this.ioNum, value);
    }
    static ID(blockID, ioNum) { return blockID * 1000 + ioNum; }
    static destructID(ioID) {
        const blockID = Math.trunc(ioID / 1000);
        const ioNum = ioID % 1000;
        return { blockID, ioNum };
    }
}
///////////////////////////////
//          Input
///////////////////////////////
export class Input extends FunctionBlockIO {
    constructor(funcBlock, ioNum, name, isCircuitIO = false) {
        super(funcBlock, ioNum, name, 'inputPin', isCircuitIO);
    }
    get connection() { return this._ref; }
    defineConnection(sourceBlockID, ioNum, inverted = false) {
        this._ref = { sourceBlockID, ioNum: ioNum, inverted };
    }
    connect(sourceBlockID, ioNum, inverted = false) {
        this.defineConnection(sourceBlockID, ioNum, inverted);
        if (this.funcBlock.onlineID) {
        }
    }
}
///////////////////////////////
//          Output
///////////////////////////////
export class Output extends FunctionBlockIO {
    constructor(funcBlock, ioNum, name, isCircuitIO = false) {
        super(funcBlock, ioNum, name, 'outputPin', isCircuitIO);
    }
}
///////////////////////////////
//      Function Block
///////////////////////////////
export class FunctionBlock {
    constructor(funcData, offlineID) {
        this.offlineID = offlineID;
        this.inputs = [];
        this.outputs = [];
        this.isCircuit = (funcData.library == 0);
        const func = (this.isCircuit) ? null : getFunction(funcData.library, funcData.opcode);
        this.funcData = funcData;
        this.name = (this.isCircuit) ? 'Circuit' : func.name;
        this.initIO(funcData, func);
    }
    initIO(data, func) {
        for (let inputNum = 0; inputNum < data.inputCount; inputNum++) {
            const ioNum = inputNum;
            const name = (func) ? func.inputs[Math.min(inputNum, func.inputs.length - 1)].name : inputNum.toString();
            this.inputs[inputNum] = new Input(this, ioNum, name, this.isCircuit);
        }
        for (let outputNum = 0; outputNum < data.outputCount; outputNum++) {
            const ioNum = data.inputCount + outputNum;
            const name = (func) ? func.outputs[Math.min(outputNum, func.inputs.length - 1)].name : outputNum.toString();
            this.outputs[outputNum] = new Output(this, ioNum, name, this.isCircuit);
        }
    }
    connectOnline(cpu, id) {
        this.onlineID = id;
        this.cpu = cpu;
    }
    readOnlineIOValues() {
        if (!this.cpu)
            return;
        this.cpu.getFunctionBlockIOValues(this.onlineID).then(ioValues => {
            ioValues.forEach((onlineValue, ioNum) => {
                this.setIOValue(ioNum, onlineValue, false);
            });
        });
    }
    setIOValue(ioNum, value, isOfflineModification = true) {
        const currentValues = this.funcData.ioValues;
        if (currentValues[ioNum] != value) {
            currentValues[ioNum] = value;
            let io;
            if (ioNum < this.inputs.length)
                io = this.inputs[ioNum];
            else
                io = this.outputs[ioNum - this.inputs.length];
            io.onValueChanged?.();
            if (isOfflineModification && this.cpu) {
                this.parentCircuit?.modified(io, 3 /* SET_IO_VALUE */, this.offlineID, ioNum);
            }
        }
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
    static async downloadOnlineData(cpu, id) {
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
        this.onlineBlocks = new Map();
        this.modifications = new Map();
        this.circuitData = circuitData;
    }
    modified(target, type, blockID, ioNum) {
        this.modifications.set(target, { type, blockID, ioNum });
    }
    ////////////////////////////
    //      Modifications
    ////////////////////////////
    createFunction(library, opcode, customInputCount, customOutputCount, callIndex) {
        const funcData = FunctionBlock.createNewData(library, opcode, customInputCount, customOutputCount);
        const offlineID = this.blocks.length;
        const funcBlock = new FunctionBlock(funcData, offlineID);
        if (!funcBlock)
            return null;
        this.blocks.push(funcBlock);
        funcBlock.parentCircuit = this;
        if (this.cpu)
            this.modified(funcBlock, 0 /* ADD_BLOCK */, offlineID);
        return funcBlock;
    }
    connectFunctionBlockInput(targetBlockID, inputNum, sourceBlockID, sourceIONum, inverted = false) {
        const targetBlock = this.blocks[targetBlockID];
        const input = targetBlock.inputs[inputNum];
        input.defineConnection(sourceBlockID, sourceIONum, inverted);
        if (this.cpu)
            this.modified(input, 4 /* CONNECT_FUNCTION_INPUT */, targetBlock.offlineID, input.ioNum);
    }
    // Read IO values from online CPU
    async readOnlineIOValues() {
        await super.readOnlineIOValues();
        this.blocks.forEach(async (block) => await block.readOnlineIOValues());
    }
    // Load function blocks from online CPU
    async loadOnlineFunctionBlocks() {
        if (!this.cpu) {
            console.error('Circuit: Can not load online blocks. no controller connected');
            return;
        }
        // Set self to online blocks for connecting circuit inputs to block IO
        this.onlineBlocks.set(this.onlineID, this);
        // Get first free offline ID
        let offlineID = this.blocks.length;
        // Load circuit's function blocks from CPU
        this.blocks = await Promise.all(this.circuitData.callIDList.map(async (onlineID) => {
            const data = await FunctionBlock.downloadOnlineData(this.cpu, onlineID);
            const block = new FunctionBlock(data, offlineID++);
            block.connectOnline(this.cpu, onlineID);
            this.onlineBlocks.set(onlineID, block);
            return block;
        }));
        // Connect loaded function blocks
        this.blocks.forEach(block => {
            block.funcData.inputRefs.forEach((ioRef, i) => {
                if (ioRef) {
                    const input = block.inputs[i];
                    const sourceBlock = this.onlineBlocks.get(ioRef.id);
                    if (sourceBlock) {
                        const inverted = !!(input.flags & 8 /* INVERTED */);
                        input.defineConnection(sourceBlock.offlineID, ioRef.ioNum, inverted);
                    }
                    else
                        console.error('Connect: source block undefined');
                }
            });
        });
    }
    async uploadChanges() {
        if (!this.cpu) {
            console.error('Upload changes: No online CPU connection');
            return;
        }
        for (const modification of this.modifications.values()) {
            await this.uploadModification(modification.type, modification.blockID, modification.ioNum);
        }
        this.modifications.clear();
    }
    async uploadModification(type, blockOfflineID, ioNum) {
        let success;
        let error;
        switch (type) {
            case 3 /* SET_IO_VALUE */:
                {
                    const block = (blockOfflineID == -1) ? this : this.blocks[blockOfflineID];
                    const value = block.funcData.ioValues[ioNum];
                    success = await this.cpu.setFunctionBlockIOValue(block.onlineID, ioNum, value);
                    break;
                }
            case 0 /* ADD_BLOCK */:
                {
                    const block = this.blocks[blockOfflineID];
                    const data = block.funcData;
                    const onlineID = await this.cpu.createFunctionBlock(data.library, data.opcode, this.onlineID, undefined, data.inputCount, data.outputCount, data.staticCount).catch(e => error = e);
                    if (onlineID) {
                        block.connectOnline(this.cpu, onlineID);
                        success = true;
                    }
                    break;
                }
            case 4 /* CONNECT_FUNCTION_INPUT */:
                {
                    const targetBlock = this.blocks[blockOfflineID];
                    const targetInput = targetBlock.inputs[ioNum];
                    const connection = targetInput.connection;
                    const sourceBlock = (connection.sourceBlockID == -1) ? this : this.blocks[connection.sourceBlockID];
                    const targetOnlineID = targetBlock.onlineID;
                    const sourceOnlineID = sourceBlock.onlineID;
                    if (!targetOnlineID || !sourceOnlineID) {
                        error = 'Invalid source of target block ID';
                        break;
                    }
                    success = await this.cpu.connectFunctionBlockInput(targetOnlineID, targetInput.ioNum, sourceOnlineID, connection.ioNum, connection.inverted).catch(e => error = e);
                    break;
                }
        }
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
    static async downloadOnline(cpu, circuitID, loadBlocks = true) {
        const funcData = await cpu.getFunctionBlockData(circuitID);
        const circuitData = await cpu.getCircuitData(circuitID);
        const circuit = new Circuit(funcData, circuitData);
        circuit.connectOnline(cpu, circuitID);
        if (loadBlocks)
            await circuit.loadOnlineFunctionBlocks();
        return circuit;
    }
}
