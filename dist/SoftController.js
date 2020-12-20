import { readStruct, writeStruct } from './TypedStructs.js';
import { DatablockType } from './SoftTypes.js';
import { FunctionHeaderStruct, functionHeaderByteLength } from './SoftTypes.js';
import { DatablockHeaderStruct, datablockHeaderByteLength } from './SoftTypes.js';
import { TaskStruct, taskStructByteLength } from './SoftTypes.js';
import { LogicLib } from './SoftFuncLib.js';
const BYTES_PER_VALUE = 4;
const BYTES_PER_REF = 4;
/*
    ///// MEMORY LAYOUT //////
    System sector:      Uint32Array     (Controller info)
    Data block table:   Uint32Array     (Datablock references)
    Task list:          Uint32Array     (Task references)
    Data sector:                        (Data Blocks)
*/
function alignBytes(addr, bytes = BYTES_PER_VALUE) {
    return Math.ceil(addr / bytes) * bytes;
}
// Load function libraries
const functionLibraries = [
    null,
    LogicLib
];
export function getFunction(libraryID, opcode) {
    if (libraryID < 1 || libraryID >= functionLibraries.length) {
        console.error('Invalid function library id', libraryID);
        return null;
    }
    const library = functionLibraries[libraryID];
    if (opcode >= Object.keys(library.functions).length) {
        console.error('Invalid function opcode', opcode);
        return null;
    }
    const func = library.getFunction(opcode);
    return func;
}
export function getFunctionName(libraryID, opcode) {
    if (libraryID < 1 || libraryID >= functionLibraries.length) {
        console.error('Invalid function library id', libraryID);
        return null;
    }
    const library = functionLibraries[libraryID];
    if (opcode >= Object.keys(library.functions).length) {
        console.error('Invalid function opcode', opcode);
        return null;
    }
    const name = library.getFunctionName(opcode);
    return name;
}
const systemSectorLength = 10;
//////////////////////////////////
//      Soft Controller
//////////////////////////////////
export default class SoftController {
    constructor(arg, datablockTableLength = 1024, taskListLength = 16, id = 1) {
        // arg = ArrayBuffer: Use existing ArrayBuffer as controller memory data
        if (typeof arg === 'object') {
            this.mem = arg;
        }
        // arg = data memory size: Create new ArrayBuffer for controller memory data
        else if (typeof arg === 'number') {
            const totalMemSize = arg + (systemSectorLength + datablockTableLength + taskListLength) * Uint32Array.BYTES_PER_ELEMENT;
            this.mem = new ArrayBuffer(totalMemSize);
        }
        this.bytes = new Uint8Array(this.mem);
        this.words = new Uint16Array(this.mem);
        this.ints = new Uint32Array(this.mem);
        this.floats = new Float32Array(this.mem);
        this.systemSector = new Uint32Array(this.mem, 0, systemSectorLength);
        // Read existing system sector data
        if (typeof arg === 'object') {
            datablockTableLength = this.datablockTableLength;
            taskListLength = this.taskListLength;
        }
        const datablockTableOffset = alignBytes(this.systemSector.byteLength);
        this.datablockTable = new Uint32Array(this.mem, datablockTableOffset, datablockTableLength);
        const taskListOffset = alignBytes(this.datablockTable.byteOffset + this.datablockTable.byteLength);
        this.taskList = new Uint32Array(this.mem, taskListOffset, taskListLength);
        const dataSectorByteOffset = alignBytes(this.taskList.byteOffset + this.taskList.byteLength);
        // Create new system sector data
        if (typeof arg === 'number') {
            const dataMemSize = arg;
            this.id = id;
            this.version = SoftController.version;
            this.totalMemSize = this.mem.byteLength;
            this.dataMemSize = arg;
            this.datablockTablePtr = datablockTableOffset;
            this.datablockTableLength = datablockTableLength;
            this.datablockTableVersion = 0;
            this.taskListPtr = taskListOffset;
            this.taskListLength = taskListLength;
            // Write initial data block for unallocated data memory
            this.markUnallocatedMemory(dataSectorByteOffset, dataMemSize);
            // Reserve data block id 0 for undefined
            this.addDatablock(new ArrayBuffer(0), DatablockType.UNDEFINED);
        }
    }
    logLine(...args) { console.log(args); }
    ;
    set id(value) { this.systemSector[0 /* id */] = value; }
    set version(value) { this.systemSector[1 /* version */] = value; }
    set totalMemSize(value) { this.systemSector[2 /* totalMemSize */] = value; }
    set dataMemSize(value) { this.systemSector[3 /* dataMemSize */] = value; }
    set datablockTablePtr(value) { this.systemSector[4 /* datablockTablePtr */] = value; }
    set datablockTableLength(value) { this.systemSector[5 /* datablockTableLength */] = value; }
    set datablockTableVersion(value) { this.systemSector[7 /* datablockTableVersion */] = value; }
    set datablockTableLastUsedID(value) { this.systemSector[6 /* dataBlockTableLastUsedID */] = value; }
    set taskListPtr(value) { this.systemSector[8 /* taskListPtr */] = value; }
    set taskListLength(value) { this.systemSector[9 /* taskListLength */] = value; }
    get id() { return this.systemSector[0 /* id */]; }
    get version() { return this.systemSector[1 /* version */]; }
    get totalMemSize() { return this.systemSector[2 /* totalMemSize */]; }
    get dataMemSize() { return this.systemSector[3 /* dataMemSize */]; }
    get datablockTablePtr() { return this.systemSector[4 /* datablockTablePtr */]; }
    get datablockTableLength() { return this.systemSector[5 /* datablockTableLength */]; }
    get datablockTableVersion() { return this.systemSector[7 /* datablockTableVersion */]; }
    get datablockTableLastUsedID() { return this.systemSector[6 /* dataBlockTableLastUsedID */]; }
    get taskListPtr() { return this.systemSector[8 /* taskListPtr */]; }
    get taskListLength() { return this.systemSector[9 /* taskListLength */]; }
    get freeMem() { return undefined; } // must sum unallocated datablocks
    /**************
     *    TICK    *
     **************/
    // Process controller tasks
    tick(dt) {
        for (const taskRef of this.taskList) {
            if (taskRef == 0)
                break;
            // read task data
            const task = this.getTask(taskRef);
            // add delta time to accumulator
            task.timeAccu += dt;
            if (task.timeAccu > task.interval) {
                task.timeAccu -= task.interval;
                // run target function / circuit
                const taskStartTime = performance.now();
                this.runFunction(task.targetRef, task.interval);
                const elapsedTime = performance.now() - taskStartTime;
                // save performance data
                task.cpuTime += elapsedTime;
                if (task.cpuTime > 1) {
                    const overflow = Math.trunc(task.cpuTime);
                    task.cpuTime -= overflow;
                    task.cpuTimeInt += overflow;
                }
                task.runCount++;
            }
            const taskByteOffset = taskRef + datablockHeaderByteLength;
            writeStruct(this.mem, taskByteOffset, TaskStruct, task);
        }
    }
    /*************************
     *    TASK PROCEDURES    *
     *************************/
    createTask(targetID, interval, offset = 0, index) {
        // check last 
        const vacantIndex = this.taskList.findIndex(value => (value == 0));
        if (vacantIndex == -1) {
            console.error('Task list is full');
            return -1;
        }
        const targetRef = this.datablockTable[targetID];
        const task = {
            targetRef,
            interval,
            offset,
            timeAccu: offset,
            cpuTime: 0,
            cpuTimeInt: 0,
            runCount: 0,
        };
        const buffer = new ArrayBuffer(taskStructByteLength);
        writeStruct(buffer, 0, TaskStruct, task);
        const taskID = this.addDatablock(buffer, DatablockType.TASK);
        if (taskID == -1) {
            console.error('Fault creating task');
            return -1;
        }
        const taskRef = this.datablockTable[taskID];
        if (index === undefined) {
            this.taskList[vacantIndex] = taskRef; // append new task
        }
        else {
            this.taskList.copyWithin(index + 1, index, vacantIndex - 1); // shift existing tasks
            this.taskList[index] = taskRef; // set new task to specified index
        }
        return taskID;
    }
    getTaskByID(id) {
        const taskRef = this.datablockTable[id];
        return this.getTask(taskRef);
    }
    getTask(taskRef) {
        const taskByteOffset = taskRef + datablockHeaderByteLength;
        return readStruct(this.mem, taskByteOffset, TaskStruct);
    }
    setTaskTarget(id, targetID) {
        const startOffset = datablockHeaderByteLength + this.datablockTable[id];
        writeStruct(this.mem, startOffset, TaskStruct, {
            targetRef: this.datablockTable[targetID]
        });
        // updateStructElement(this.mem, startOffset, TaskStruct, 'targetRef', this.datablockTable[targetID]);
    }
    /****************************
     *    CIRCUIT PROCEDURES    *
     ****************************/
    static calcCircuitSize(inputCount, outputCount, staticCount) {
        let byteLength = SoftController.calcFunctionSize(inputCount, outputCount, staticCount);
        byteLength += outputCount * BYTES_PER_REF; // output references
        return byteLength;
    }
    // Creates a new circuit data block
    createCircuit(inputCount, outputCount, functionCount) {
        const funcHeader = {
            library: 0,
            opcode: 0,
            inputCount,
            outputCount,
            staticCount: functionCount,
            funcFlags: 0,
            reserve: 0
        };
        const byteLength = SoftController.calcCircuitSize(inputCount, outputCount, functionCount);
        const buffer = new ArrayBuffer(byteLength);
        const bytes = new Uint8Array(buffer);
        let offset = writeStruct(buffer, 0, FunctionHeaderStruct, funcHeader); // Write function header
        bytes.fill(16 /* HIDDEN */, offset, offset + inputCount + outputCount); // Write IO flags (hidden by default)
        return this.addDatablock(buffer, DatablockType.CIRCUIT);
    }
    deleteCircuit(id) {
        const blockRef = this.datablockTable[id];
        const circHeader = this.readFunctionHeader(blockRef);
        const pointers = this.functionDataMap(blockRef);
        const funcCallList = this.ints.subarray(pointers.statics, pointers.statics + circHeader.staticCount);
        funcCallList.forEach(ref => {
            const callID = this.getDatablockIDbyRef(ref);
            if (callID > 0)
                this.unallocateDatablock(callID);
        });
        // TODO: remove task
        this.deleteFunctionBlock(id);
    }
    defineCircuitIO(id, ioNum, flags, value = 0) {
        const circHeader = this.readFunctionHeaderByID(id);
        if (ioNum < 0 || ioNum >= circHeader.inputCount + circHeader.outputCount) {
            console.error('Invalid circuit IO index', ioNum);
            return false;
        }
        const pointers = this.functionDataMapByID(id, circHeader);
        this.bytes[pointers.flags + ioNum] = flags;
        this.floats[pointers.inputs + ioNum] = value;
        return true;
    }
    getCircuitCallList(ref) {
        const circHeader = this.readFunctionHeader(ref);
        const pointers = this.functionDataMap(ref, circHeader);
        const funcCallList = this.ints.subarray(pointers.statics, pointers.statics + circHeader.staticCount);
        return funcCallList;
    }
    // Adds function call to circuit
    addFunctionCall(circuitID, functionID, callIndex) {
        const circRef = this.datablockTable[circuitID];
        const funcCallList = this.getCircuitCallList(circRef);
        const functionRef = this.datablockTable[functionID];
        const vacantIndex = funcCallList.indexOf(0); // find first vacant call index
        if (vacantIndex == -1) {
            console.error('Circuit function call list is full');
            return false;
        }
        if (callIndex === undefined) {
            funcCallList[vacantIndex] = functionRef; // append new function call
        }
        else {
            funcCallList.copyWithin(callIndex + 1, callIndex, vacantIndex - 1); // shift existing function calls
            funcCallList[callIndex] = functionRef; // set new function call to specified index
        }
        return true;
    }
    removeFunctionCall(circuitID, functionID) {
        const circRef = this.datablockTable[circuitID];
        const funcCallList = this.getCircuitCallList(circRef);
        const functionRef = this.datablockTable[functionID];
        const callIndex = funcCallList.indexOf(functionRef); // find function call index
        if (callIndex == -1) {
            console.error('Tried to remove invalid function call reference', functionRef);
            return false;
        }
        if (callIndex < funcCallList.length - 1) {
            funcCallList.copyWithin(callIndex, callIndex + 1); // shift function calls to fill up removed index
        }
        funcCallList[funcCallList.length - 1] = 0; // remove last index from call list
        const functionDataMap = this.functionDataMap(functionRef);
        const ioRefRangeStart = functionDataMap.inputs; // calculate function IO values reference range
        const ioRefRangeEnd = functionDataMap.statics - 1;
        for (let i = 0; i < funcCallList.length; i++) { // remove references to deleted function block from other functions
            const ref = funcCallList[i];
            if (ref == 0)
                break;
            this.udpdateFunctionInputRefs(ref, ioRefRangeStart, ioRefRangeEnd);
        }
        return true;
    }
    getCircuitOutputRefPointer(id, outputRefNum) {
        const header = this.readFunctionHeaderByID(id);
        const pointers = this.functionDataMapByID(id, header);
        return pointers.statics + header.staticCount + outputRefNum;
    }
    connectCircuitOutput(circuitId, outputNum, sourceFuncId, sourceIONum) {
        const sourceIOPointer = this.getFunctionIOPointer(sourceFuncId, sourceIONum);
        const outputRefPointer = this.getCircuitOutputRefPointer(circuitId, outputNum);
        this.ints[outputRefPointer] = sourceIOPointer;
    }
    readCircuitOutputRefs(ref) {
        const header = this.readFunctionHeader(ref);
        const pointers = this.functionDataMap(ref, header);
        const start = pointers.statics + header.staticCount;
        const outputRefs = this.ints.slice(start, start + header.outputCount);
        return outputRefs;
    }
    readCircuitCallList(ref) {
        return this.getCircuitCallList(ref).slice();
    }
    /****************************
     *    FUNCTION PROCEDURES   *
     ****************************/
    setFunctionIOValue(id, ioNum, value) {
        const pointers = this.functionDataMapByID(id);
        if (ioNum < (pointers.statics - pointers.inputs)) {
            this.floats[pointers.inputs + ioNum] = value;
        }
    }
    setFunctionIOFlags(id, ioNum, flags) {
        const pointers = this.functionDataMapByID(id);
        if (ioNum < (pointers.statics - pointers.inputs)) {
            this.bytes[pointers.flags + ioNum] = flags;
        }
    }
    setFunctionIOFlag(id, ioNum, flag) {
        const pointers = this.functionDataMapByID(id);
        this.bytes[pointers.flags + ioNum] |= flag;
    }
    clearFunctionIOFlag(id, ioNum, flag) {
        const pointers = this.functionDataMapByID(id);
        this.bytes[pointers.flags + ioNum] &= ~flag;
    }
    connectFunctionInput(funcId, inputNum, sourceFuncId, sourceIONum, inverted = false) {
        const sourceIOPointer = this.getFunctionIOPointer(sourceFuncId, sourceIONum);
        const inputRefPointer = this.getFunctionInputRefPointer(funcId, inputNum);
        this.ints[inputRefPointer] = sourceIOPointer;
        if (inverted)
            this.setFunctionIOFlag(funcId, inputNum, 8 /* INVERTED */);
    }
    static calcFunctionSize(inputCount, outputCount, staticCount) {
        const ioCount = inputCount + outputCount;
        let byteLength = functionHeaderByteLength; // Function header
        byteLength += alignBytes(ioCount); // IO flags
        byteLength += inputCount * BYTES_PER_REF; // Input references
        byteLength += (ioCount + staticCount) * BYTES_PER_VALUE; // IO and static values
        return byteLength;
    }
    // Creates new function data block
    createFunctionBlock(library, opcode, circuitID, callIndex, inputCount, outputCount, staticCount) {
        const func = getFunction(library, opcode);
        if (!func)
            return null;
        inputCount = (func.variableInputCount && inputCount != undefined
            && (inputCount <= func.variableInputCount.max) && (inputCount >= func.variableInputCount.min))
            ? inputCount : func.inputs.length;
        outputCount = (func.variableOutputCount && outputCount != undefined
            && (outputCount <= func.variableOutputCount.max) && (outputCount >= func.variableOutputCount.min))
            ? outputCount : func.outputs.length;
        staticCount = (func.variableStaticCount && staticCount != undefined
            && (staticCount <= func.variableStaticCount.max) && (staticCount >= func.variableStaticCount.min))
            ? staticCount : func.staticCount || 0;
        const funcHeader = {
            library,
            opcode,
            inputCount,
            outputCount,
            staticCount,
            funcFlags: 0,
            reserve: 0
        };
        const byteLength = SoftController.calcFunctionSize(inputCount, outputCount, staticCount);
        const buffer = new ArrayBuffer(byteLength);
        writeStruct(buffer, 0, FunctionHeaderStruct, funcHeader); // Write function header
        const flagsOffset = functionHeaderByteLength;
        const inputRefsOffset = alignBytes(flagsOffset + inputCount + outputCount);
        const ioValuesOffset = inputRefsOffset + inputCount * BYTES_PER_REF;
        const ioFlags = new Uint8Array(buffer, flagsOffset);
        const ioValues = new Float32Array(buffer, ioValuesOffset);
        const firstOutput = inputCount;
        func.inputs.forEach((input, i) => {
            ioFlags[i] = input.flags;
            ioValues[i] = input.initValue;
        });
        if (inputCount > func.inputs.length) { // Variable input count reached by copying default input
            const lastInput = func.inputs[func.inputs.length - 1];
            for (let i = func.inputs.length; i < inputCount; i++) {
                ioFlags[i] = lastInput.flags;
                ioValues[i] = lastInput.initValue;
            }
        }
        func.outputs.forEach((output, i) => {
            ioFlags[firstOutput + i] = output.flags;
            ioValues[firstOutput + i] = output.initValue;
        });
        if (outputCount > func.outputs.length) { // Variable output count reached by copying default output
            const lastOutput = func.outputs[func.outputs.length - 1];
            for (let i = func.outputs.length; i < outputCount; i++) {
                ioFlags[firstOutput + i] = lastOutput.flags;
                ioValues[firstOutput + i] = lastOutput.initValue;
            }
        }
        const id = this.addDatablock(buffer, DatablockType.FUNCTION, circuitID || 0);
        // Add function call to circuit
        if (circuitID) {
            this.addFunctionCall(circuitID, id, callIndex);
        }
        console.log(`for function ${functionLibraries[library].getFunctionName(opcode)} [inputs ${inputCount}, outputs ${outputCount}, statics ${staticCount}]`);
        return id;
    }
    deleteFunctionBlock(id) {
        const blockHeader = this.getDatablockHeaderByID(id);
        const parentID = blockHeader.parentID;
        if (parentID) {
            this.removeFunctionCall(parentID, id);
        }
    }
    readFunctionHeaderByID(id) {
        let datablockRef = this.datablockTable[id];
        return this.readFunctionHeader(datablockRef);
    }
    // Optimized version! Any struct change will break this
    readFunctionHeader(datablockRef) {
        const byteOffset = datablockRef + datablockHeaderByteLength;
        return {
            library: this.bytes[byteOffset + 0],
            opcode: this.bytes[byteOffset + 1],
            inputCount: this.bytes[byteOffset + 2],
            outputCount: this.bytes[byteOffset + 3],
            staticCount: this.words[(byteOffset + 4) / 2],
            funcFlags: this.bytes[byteOffset + 5],
            reserve: 0
        };
    }
    functionDataMapByID(id, header) {
        const datablockRef = this.datablockTable[id];
        return this.functionDataMap(datablockRef, header);
    }
    functionDataMap(datablockRef, header) {
        header = header || this.readFunctionHeader(datablockRef);
        const flags = datablockRef + datablockHeaderByteLength + functionHeaderByteLength;
        const inputRefs = alignBytes(flags + header.inputCount + header.outputCount) / BYTES_PER_VALUE;
        const inputs = inputRefs + header.inputCount;
        const outputs = inputs + header.inputCount;
        const statics = outputs + header.outputCount;
        return {
            flags,
            inputRefs,
            inputs,
            outputs,
            statics
        };
    }
    getFunctionIOPointer(id, ioNum) {
        const pointers = this.functionDataMapByID(id);
        return pointers.inputs + ioNum;
    }
    getFunctionInputRefPointer(id, inputRefNum) {
        const pointers = this.functionDataMapByID(id);
        return pointers.inputRefs + inputRefNum;
    }
    readFunctionIOValues(ref) {
        const pointers = this.functionDataMap(ref);
        const ioValues = this.floats.slice(pointers.inputs, pointers.statics);
        return ioValues;
    }
    readFunctionInputRefs(ref) {
        const pointers = this.functionDataMap(ref);
        const inputRefs = this.ints.slice(pointers.inputRefs, pointers.inputs);
        return inputRefs;
    }
    readFunctionIOFlags(ref) {
        const funcHeader = this.readFunctionHeader(ref);
        const pointers = this.functionDataMap(ref, funcHeader);
        const ioCount = funcHeader.inputCount + funcHeader.outputCount;
        const ioFlags = this.bytes.slice(pointers.flags, pointers.flags + ioCount);
        return ioFlags;
    }
    solveIOReference(ioRef) {
        if (!ioRef)
            return null;
        const byteOffset = ioRef * BYTES_PER_REF;
        let solved = null;
        for (let id = 0; id < this.datablockTableLastUsedID; id++) {
            const blockRef = this.datablockTable[id];
            const blockHeader = this.getDatablockHeader(blockRef);
            if (byteOffset > blockRef && byteOffset < blockRef + blockHeader.byteLength
                && (blockHeader.type == DatablockType.FUNCTION || blockHeader.type == DatablockType.CIRCUIT)) {
                const pointers = this.functionDataMap(blockRef);
                if (ioRef >= pointers.inputs && ioRef < pointers.statics) {
                    const ioNum = ioRef - pointers.inputs;
                    solved = { id, ioNum };
                }
            }
        }
        if (!solved)
            console.error('Trying to solve invalid IO reference', ioRef);
        return solved;
    }
    // Remove or offset all references to given function or circuit to be deleted or moved
    udpdateFunctionInputRefs(blockRef, ioRefRangeStart, ioRefRangeEnd, offset) {
        const funcDataMap = this.functionDataMap(blockRef);
        const inputReferences = this.ints.subarray(funcDataMap.inputRefs, funcDataMap.inputs);
        inputReferences.forEach((ioRef, i) => {
            if (ioRef >= ioRefRangeStart && ioRef <= ioRefRangeEnd) {
                inputReferences[i] = (offset) ? ioRef + offset : 0;
            }
        });
    }
    runFunction(blockRef, dt) {
        const blockHeader = this.getDatablockHeader(blockRef);
        const funcHeader = this.readFunctionHeader(blockRef);
        const pointers = this.functionDataMap(blockRef, funcHeader);
        for (let i = 0; i < funcHeader.inputCount; i++) { // update input values from input references
            const inputRef = this.ints[pointers.inputRefs + i];
            const ioFlag = this.bytes[pointers.flags + i];
            if (inputRef > 0) {
                let value = this.floats[inputRef];
                if (ioFlag & 2 /* BOOLEAN */) {
                    value = (value && 1) ^ (ioFlag & 8 /* INVERTED */ && 1);
                }
                else if (ioFlag & 4 /* INTEGER */) {
                    value = Math.floor(value);
                }
                this.floats[pointers.inputs + i] = value;
            }
        }
        if (blockHeader.type == DatablockType.FUNCTION) // Run function
         {
            const func = getFunction(funcHeader.library, funcHeader.opcode);
            const params = {
                inputCount: funcHeader.inputCount,
                outputCount: funcHeader.outputCount,
                staticCount: funcHeader.staticCount,
                input: pointers.inputs,
                output: pointers.outputs,
                static: pointers.statics,
                dt
            };
            // TESTING
            func.run(params, this.floats);
        }
        else if (blockHeader.type == DatablockType.CIRCUIT) // Run circuit
         {
            const funcCallCount = funcHeader.staticCount;
            const funcCalls = pointers.statics;
            const outputRefs = funcCalls + funcHeader.staticCount;
            for (let i = 0; i < funcCallCount; i++) // Call functions in circuit call list
             {
                const callRef = this.ints[funcCalls + i];
                this.runFunction(callRef, dt);
            }
            const outputFlags = pointers.flags + funcHeader.inputCount;
            for (let i = 0; i < funcHeader.outputCount; i++) // Update circuit outputs from output references
             {
                const outputRef = this.ints[outputRefs + i];
                const ioFlag = this.bytes[outputFlags + i];
                if (outputRef > 0) {
                    let value = this.floats[outputRef];
                    if (ioFlag & 2 /* BOOLEAN */) {
                        value = (value) ? 1 : 0;
                    }
                    else if (ioFlag & 4 /* INTEGER */) {
                        value = Math.floor(value);
                    }
                    this.floats[pointers.outputs + i] = value;
                }
            }
        }
    }
    /******************************
     *    DATA BLOCK PROCEDURES   *
     ******************************/
    // Adds data block to controller memory and reference to data block table
    addDatablock(data, type, parentID = 0, flags = 0) {
        const allocation = this.allocateDatablock(data.byteLength);
        if (!allocation) {
            console.error('Could not create new data block');
            return -1;
        }
        const dataBlockHeader = {
            byteLength: allocation.byteLength,
            type,
            flags,
            parentID
        };
        const dataBytes = new Uint8Array(data);
        const offset = writeStruct(this.mem, allocation.startByteOffset, DatablockHeaderStruct, dataBlockHeader); // Write data block header
        this.bytes.set(dataBytes, offset); // Write data block body
        console.log(`Created data block id ${allocation.id}, size ${allocation.byteLength} bytes, offset ${allocation.startByteOffset}`);
        return allocation.id;
    }
    allocateDatablock(dataByteLength) {
        const candidates = [];
        const allocationByteLength = alignBytes(datablockHeaderByteLength + dataByteLength);
        for (let id = 0; id < this.datablockTable.length; id++) {
            const datablockRef = this.datablockTable[id];
            if (datablockRef == 0)
                break;
            const datablockHeader = this.getDatablockHeader(datablockRef);
            if (datablockHeader.type == DatablockType.UNALLOCATED && datablockHeader.byteLength >= allocationByteLength) {
                candidates.push({ id, excessMem: datablockHeader.byteLength - allocationByteLength });
            }
        }
        if (candidates.length == 0) {
            console.error('Controller out of memory');
            return null;
        }
        candidates.sort((a, b) => a.excessMem - b.excessMem);
        const target = candidates[0];
        const targetStartOffset = this.datablockTable[target.id];
        const unallocatedStartOffset = targetStartOffset + allocationByteLength;
        this.markUnallocatedMemory(unallocatedStartOffset, target.excessMem);
        return {
            id: target.id,
            startByteOffset: targetStartOffset,
            byteLength: allocationByteLength
        };
    }
    deleteDatablock(id) {
        // set data block type to UNALLOCATED
        const blockRef = this.datablockTable[id];
        const blockHeader = this.getDatablockHeader(blockRef);
        if (blockHeader.type == DatablockType.CIRCUIT) { // Delete circuit
            this.deleteCircuit(id);
        }
        else if (blockHeader.type == DatablockType.FUNCTION) {
            this.deleteFunctionBlock(id);
        }
        this.unallocateDatablock(id);
    }
    unallocateDatablock(id) {
        let ref = this.datablockTable[id];
        let byteLength = this.getDatablockHeader(ref).byteLength;
        // If previous block is unallocated then merge with this
        const prevBlockID = this.findPreviousDatablock(ref, DatablockType.UNALLOCATED);
        if (prevBlockID) {
            ref = this.datablockTable[prevBlockID];
            byteLength += this.getDatablockHeader(ref).byteLength;
            this.deleteDatablockID(prevBlockID);
        }
        // If next block is unallocated then merge with this
        const nextBlockID = this.findNextDatablock(ref, DatablockType.UNALLOCATED);
        if (nextBlockID) {
            byteLength += this.getDatablockHeaderByID(nextBlockID).byteLength;
            this.deleteDatablockID(nextBlockID);
        }
        const header = {
            byteLength,
            type: DatablockType.UNALLOCATED,
            flags: 0,
            parentID: 0
        };
        writeStruct(this.mem, ref, DatablockHeaderStruct, header);
        this.datablockTable[id] = ref;
        console.log(`Unallocated block ${id}. prev: ${prevBlockID}, next: ${nextBlockID}, offset: ${ref.toString(16)}`, header);
    }
    markUnallocatedMemory(startByteOffset, byteLength) {
        let id;
        const nextBlockID = this.findNextDatablock(startByteOffset, DatablockType.UNALLOCATED);
        // If next data block in memory is unallocated then merge blocks
        if (nextBlockID) {
            id = nextBlockID;
            const nextBlockRef = this.datablockTable[nextBlockID];
            const nextBlockHeader = this.getDatablockHeader(nextBlockRef);
            byteLength = (nextBlockRef - startByteOffset) + nextBlockHeader.byteLength;
        }
        else {
            if (byteLength <= datablockHeaderByteLength)
                return;
            id = this.getNewDatablockID();
            if (id == -1)
                return;
        }
        this.datablockTable[id] = startByteOffset;
        const header = {
            byteLength,
            type: DatablockType.UNALLOCATED,
            flags: 0,
            parentID: 0
        };
        writeStruct(this.mem, startByteOffset, DatablockHeaderStruct, header);
    }
    getDatablockHeaderByID(id) {
        let datablockRef = this.datablockTable[id];
        return this.getDatablockHeader(datablockRef);
    }
    getDatablockHeader(datablockRef) {
        return readStruct(this.mem, datablockRef, DatablockHeaderStruct);
    }
    getNewDatablockID() {
        const id = this.datablockTable.findIndex(ptr => ptr == 0);
        if (id == -1) {
            console.error('Controller data block table full');
        }
        this.datablockTableVersion++;
        this.datablockTableLastUsedID = Math.max(this.datablockTableLastUsedID, id);
        return id;
    }
    deleteDatablockID(id) {
        this.datablockTable[id] = 0;
        if (id == this.datablockTableLastUsedID) {
            let lastID = this.datablockTable.length;
            while (lastID--) {
                if (this.datablockTable[lastID] > 0)
                    break;
            }
            this.datablockTableLastUsedID = lastID;
        }
    }
    getDatablockIDbyRef(ref) {
        const id = this.datablockTable.lastIndexOf(ref, this.datablockTableLastUsedID);
        if (id == -1) {
            console.error('Invalid data block reference', ref);
        }
        return id;
    }
    findPreviousDatablock(ref, type) {
        let candidateID;
        let candidateOffset = Number.MAX_SAFE_INTEGER;
        for (let id = 0; id < this.datablockTableLastUsedID; id++) {
            const candidateRef = this.datablockTable[id];
            const candidateType = this.getDatablockHeader(candidateRef).type;
            const offset = ref - candidateRef;
            if ((type == undefined || type == candidateType) && offset > 0 && offset < candidateOffset) {
                candidateOffset = offset;
                candidateID = id;
            }
        }
        return candidateID;
    }
    findNextDatablock(ref, type) {
        let candidateID;
        let candidateOffset = Number.MAX_SAFE_INTEGER;
        for (let id = 0; id < this.datablockTableLastUsedID; id++) {
            const candidateRef = this.datablockTable[id];
            const candidateType = this.getDatablockHeader(candidateRef).type;
            const offset = candidateRef - ref;
            if ((type == undefined || type == candidateType) && offset > 0 && offset < candidateOffset) {
                candidateOffset = offset;
                candidateID = id;
            }
        }
        return candidateID;
    }
}
SoftController.version = 1;
