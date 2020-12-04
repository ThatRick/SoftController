import { sizeOfStruct, readStruct, writeStruct } from './TypedStructs';
import { DatablockType, DatablockHeaderStruct, FunctionHeaderStruct, datablockHeaderByteLength, functionHeaderByteLength } from './SoftTypes';
import { LogicLib } from './SoftFuncLib';
const BYTES_PER_VALUE = 4;
const BYTES_PER_REF = 4;
/*
///// MEMORY LAYOUT //////
addr (bytes)
----
0000    null
0004    [System sector DB header]   always at mem offset 1
....    [System sector DB data]
[00]    [datablock table DB header] always at table pointer 0
....    [datablock table DB data]
[01]    [datablock x]
....

*/
function alignBytes(addr, bytes = BYTES_PER_VALUE) {
    return Math.ceil(addr / bytes) * bytes;
}
const systemSectorLength = 9;
//////////////////////////////////
//      Soft Controller
//////////////////////////////////
export default class SoftController {
    constructor(arg, datablockTableLength = 1024, taskListLength = 16, id = 1) {
        // If memory size is given create new ArrayBuffer for controller memory data
        // else existing ArrayBuffer is given as controller memory data
        this.mem = (typeof arg === 'number') ? new ArrayBuffer(arg) : arg;
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
            const memSize = arg;
            const freeDataMemPtr = dataSectorByteOffset;
            this.id = id;
            this.version = SoftController.version;
            this.totalMemSize = memSize;
            this.freeDataMemPtr = freeDataMemPtr;
            this.datablockTablePtr = datablockTableOffset;
            this.datablockTableLength = datablockTableLength;
            this.datablockTableVersion = 0;
            this.taskListPtr = taskListOffset;
            this.taskListLength = taskListLength;
        }
        // Load function libraries
        this.functionLibraries = [
            LogicLib
        ];
    }
    logLine(line) { console.log(line); }
    ;
    set id(value) { this.systemSector[0 /* id */] = value; }
    set version(value) { this.systemSector[1 /* version */] = value; }
    set totalMemSize(value) { this.systemSector[2 /* totalMemSize */] = value; }
    set freeDataMemPtr(value) { this.systemSector[3 /* freeDataMemPtr */] = value; }
    set datablockTablePtr(value) { this.systemSector[4 /* datablockTablePtr */] = value; }
    set datablockTableLength(value) { this.systemSector[5 /* datablockTableLength */] = value; }
    set datablockTableVersion(value) { this.systemSector[6 /* datablockTableVersion */] = value; }
    set taskListPtr(value) { this.systemSector[7 /* taskListPtr */] = value; }
    set taskListLength(value) { this.systemSector[8 /* taskListLength */] = value; }
    get id() { return this.systemSector[0 /* id */]; }
    get version() { return this.systemSector[1 /* version */]; }
    get totalMemSize() { return this.systemSector[2 /* totalMemSize */]; }
    get freeDataMemPtr() { return this.systemSector[3 /* freeDataMemPtr */]; }
    get datablockTablePtr() { return this.systemSector[4 /* datablockTablePtr */]; }
    get datablockTableLength() { return this.systemSector[5 /* datablockTableLength */]; }
    get datablockTableVersion() { return this.systemSector[6 /* datablockTableVersion */]; }
    get taskListPtr() { return this.systemSector[7 /* taskListPtr */]; }
    get taskListLength() { return this.systemSector[8 /* taskListLength */]; }
    get totalDataMemSize() { return this.totalMemSize - this.bytes.byteOffset; }
    get freeMem() { return this.totalDataMemSize - this.freeDataMemPtr; }
    // Process controller tasks
    tick() {
        Date.now();
    }
    // Creates a new circuit data block
    createCircuitBlock(inputCount, outputCount, functionCount) {
        const ioCount = inputCount + outputCount;
        let byteLength = sizeOfStruct(FunctionHeaderStruct); // Function header
        byteLength += alignBytes(ioCount); // IO flags
        byteLength += inputCount * BYTES_PER_REF; // Input references
        byteLength += ioCount * BYTES_PER_VALUE; // IO values
        byteLength += functionCount * BYTES_PER_VALUE; // function calls
        byteLength += outputCount * BYTES_PER_VALUE; // output references
        const funcHeader = {
            library: 0,
            opcode: 0,
            inputCount,
            outputCount,
            staticCount: functionCount,
            funcFlags: 0,
            reserve: 0
        };
        const buffer = new ArrayBuffer(byteLength);
        const bytes = new Uint8Array(buffer);
        let offset = writeStruct(buffer, 0, FunctionHeaderStruct, funcHeader); // Write function header
        bytes.fill(16 /* HIDDEN */, offset, offset + ioCount); // Write IO flags (hidden by default)
        return this.addDatablock(DatablockType.CIRCUIT, buffer);
    }
    // Adds function call to circuit
    addFunctionCall(circuitID, functionID, index) {
        const circHeader = this.getFunctionHeader(circuitID);
        const pointers = this.getFunctionDataMap(circuitID, circHeader);
        const funcCallList = this.ints.subarray(pointers.statics, pointers.statics + circHeader.staticCount);
        // check last 
        const vacantIndex = funcCallList.findIndex(value => (value == 0));
        if (vacantIndex == -1) {
            console.error('Circuit function call list is full');
            return false;
        }
        if (index === undefined) {
            funcCallList[vacantIndex] = functionID; // append new function call
        }
        else {
            funcCallList.copyWithin(index + 1, index, vacantIndex - 1); // shift existing function calls
            funcCallList[index] = functionID; // set new function call to specified index
        }
        return true;
    }
    // Creates new function data block
    createFunctionBlock(library, opcode, inputCount, outputCount, staticCount) {
        if (library >= this.functionLibraries.length) {
            console.error('Invalid function library id', library);
            return null;
        }
        const lib = this.functionLibraries[library];
        if (opcode >= Object.keys(lib.functions).length) {
            console.error('Invalid function opcode', opcode);
            return null;
        }
        const func = lib.functions[opcode];
        console.log('Creating function', Object.keys(lib)[opcode]);
        inputCount = (func.variableInputCount && inputCount
            && (inputCount <= func.variableInputCount.max) && (inputCount >= func.variableInputCount.min)) ? inputCount : func.inputs.length;
        outputCount = (func.variableOutputCount && outputCount
            && (outputCount <= func.variableOutputCount.max) && (outputCount >= func.variableOutputCount.min)) ? outputCount : func.outputs.length;
        staticCount = (func.variableStaticCount && staticCount
            && (staticCount <= func.variableStaticCount.max) && (staticCount >= func.variableStaticCount.min)) ? staticCount : func.staticCount;
        const ioCount = inputCount + outputCount;
        let byteLength = sizeOfStruct(FunctionHeaderStruct); // Function header
        byteLength += alignBytes(ioCount); // IO flags
        byteLength += inputCount * BYTES_PER_REF; // Input references
        byteLength += (ioCount + func.staticCount) * BYTES_PER_VALUE; // IO and static values
        const funcHeader = {
            library,
            opcode,
            inputCount,
            outputCount,
            staticCount: func.staticCount,
            funcFlags: 0,
            reserve: 0
        };
        const buffer = new ArrayBuffer(byteLength);
        const data = new DataView(buffer);
        let offset = writeStruct(buffer, 0, FunctionHeaderStruct, funcHeader); // Write function header
        func.inputs.forEach(input => data.setUint8(offset++, input.flags)); // Write input flags
        if (inputCount > func.inputs.length) { // Variable input count reached by copying default input flags
            const copyCount = inputCount - func.inputs.length;
            const flags = func.inputs[func.inputs.length - 1].flags;
            for (let i = 0; i < copyCount; i++)
                data.setUint8(offset++, flags);
        }
        func.outputs.forEach(output => data.setUint8(offset++, output.flags)); // Write output flags
        if (outputCount > func.outputs.length) { // Variable output count reached by copying default output flags
            const copyCount = outputCount - func.outputs.length;
            const flags = func.outputs[func.outputs.length - 1].flags;
            for (let i = 0; i < copyCount; i++)
                data.setUint8(offset++, flags);
        }
        offset = alignBytes(offset); // align offset after flag bytes
        offset += inputCount * BYTES_PER_REF; // Step over input references
        func.inputs.forEach(input => {
            data.setFloat32(offset, input.initValue);
            offset += BYTES_PER_VALUE;
        });
        if (inputCount > func.inputs.length) { // Variable input count reached by copying default input value
            const copyCount = inputCount - func.inputs.length;
            const value = func.inputs[func.inputs.length - 1].initValue;
            for (let i = 0; i < copyCount; i++) {
                data.setFloat32(offset, value);
                offset += BYTES_PER_VALUE;
            }
        }
        func.outputs.forEach(output => {
            data.setFloat32(offset, output.initValue);
            offset += BYTES_PER_VALUE;
        });
        if (outputCount > func.outputs.length) { // Variable output count reached by copying default output value
            const copyCount = outputCount - func.outputs.length;
            const value = func.outputs[func.outputs.length - 1].initValue;
            for (let i = 0; i < copyCount; i++) {
                data.setFloat32(offset, value);
                offset += BYTES_PER_VALUE;
            }
        }
        return this.addDatablock(DatablockType.FUNCTION, buffer);
    }
    // Adds data block to controller memory and reference to data block table
    addDatablock(type, data) {
        const totalByteLength = sizeOfStruct(DatablockHeaderStruct) + data.byteLength;
        const dataBlockHeader = {
            byteLength: totalByteLength,
            type: DatablockType.FUNCTION,
            flags: 0,
            reserve: 0
        };
        if (this.freeMem < data.byteLength) {
            console.error('Controller out of memory');
            return -1;
        }
        const id = this.datablockTable.findIndex(ptr => ptr == 0);
        if (id == -1) {
            console.error('Controller data block table full');
            return -1;
        }
        const dataBytes = new Uint8Array(data);
        let offset = this.freeDataMemPtr;
        offset += writeStruct(this.bytes, offset, DatablockHeaderStruct, dataBlockHeader); // Write data block header
        this.bytes.set(dataBytes, offset); // Write data block body
        this.freeDataMemPtr += totalByteLength;
        this.datablockTable[id] = offset;
        this.datablockTableVersion++;
        return id;
    }
    getDatablockHeader(id) {
        let byteOffset = this.datablockTable[id];
        return readStruct(this.mem, byteOffset, DatablockHeaderStruct);
    }
    /*
        getFunctionHeader(id: ID): IFunctionHeader {
            let byteOffset = this.datablockTable[id] + datablockHeaderByteLength;
            return readStruct(this.mem, byteOffset, FunctionHeaderStruct) as unknown as IFunctionHeader;
        }
    */
    // Optimized version! Any struct change will break this
    getFunctionHeader(id) {
        let byteOffset = this.datablockTable[id] + datablockHeaderByteLength;
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
    getFunctionDataMap(id, header) {
        header = header || this.getFunctionHeader(id);
        const flags = this.datablockTable[id] + datablockHeaderByteLength + functionHeaderByteLength;
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
        const pointers = this.getFunctionDataMap(id);
        return pointers.inputs + ioNum;
    }
    getFunctionInputRefPointer(id, inputRefNum) {
        const pointers = this.getFunctionDataMap(id);
        return pointers.inputRefs + inputRefNum;
    }
    connectFunctionInput(funcId, inputNum, sourceFuncId, sourceIONum) {
        const sourceIOPointer = this.getFunctionIOPointer(sourceFuncId, sourceIONum);
        const inputRefPointer = this.getFunctionInputRefPointer(funcId, inputNum);
        this.ints[inputRefPointer] = sourceIOPointer;
    }
    runFunction(id, dt) {
        const dataBlockHeader = this.getDatablockHeader(id);
        const functionHeader = this.getFunctionHeader(id);
        const pointers = this.getFunctionDataMap(id, functionHeader);
        for (let i = 0; i < functionHeader.inputCount; i++) { // update input values from input references
            const inputRef = this.ints[pointers.inputRefs + i];
            const ioFlag = this.bytes[pointers.flags + i];
            if (inputRef) {
                let value = this.floats[inputRef];
                if (ioFlag & 2 /* BOOLEAN */) {
                    value = ((value) ? 1 : 0) ^ (ioFlag & 8 /* INVERTED */);
                }
                else if (ioFlag & 4 /* INTEGER */) {
                    value = Math.floor(value);
                }
                this.floats[pointers.inputs + i] = value;
            }
        }
        if (dataBlockHeader.type == DatablockType.FUNCTION) // Run function
         {
            const func = this.functionLibraries[functionHeader.library].functions[functionHeader.opcode];
            const params = {
                inputCount: functionHeader.inputCount,
                outputCount: functionHeader.outputCount,
                staticCount: functionHeader.staticCount,
                input: pointers.inputs,
                output: pointers.outputs,
                static: pointers.statics,
                dt
            };
            func.run(params, this.floats);
        }
        else if (dataBlockHeader.type == DatablockType.CIRCUIT) // Run circuit
         {
            const funcCallCount = functionHeader.staticCount;
            const funcCalls = pointers.statics;
            const outputRefs = funcCalls + functionHeader.staticCount;
            for (let i = 0; i < funcCallCount; i++) // Call functions in circuit call list
             {
                const funcID = this.ints[funcCalls + i];
                this.runFunction(funcID, dt);
            }
            const outputFlags = pointers.flags + functionHeader.inputCount;
            for (let i = 0; i < functionHeader.outputCount; i++) // Update circuit outputs from output references
             {
                const outputRef = this.ints[outputRefs + i];
                const ioFlag = this.bytes[outputFlags + i];
                if (outputRef) {
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
}
SoftController.version = 1;
