import { sizeOfStruct, readStruct, writeStruct } from './TypedStructs';
import { DatablockType, DatablockHeaderStruct, FunctionHeaderStruct, datablockHeaderByteLength, functionHeaderByteLength } from './SoftTypes';
import { LogicLib } from './SoftFuncLib';
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
function alignBytes(addr, bytes = 4) {
    return Math.ceil(addr / bytes) * bytes;
}
const SystemSectorLength = 9;
//////////////////////////////////
//      Soft Controller
//////////////////////////////////
export default class SoftController {
    constructor(arg, datablockTableLength = 256, id = 1) {
        this.logLine = (line) => console.log(line);
        this.mem = (typeof arg === 'number') ? new ArrayBuffer(arg) : arg;
        this.systemSector = new Uint32Array(this.mem, 0, SystemSectorLength);
        const datablockTableOffset = alignBytes(this.systemSector.byteLength);
        this.datablockTable = new Uint32Array(this.mem, datablockTableOffset, datablockTableLength);
        const dataSectorByteOffset = alignBytes(datablockTableOffset + this.datablockTable.byteLength);
        this.bytes = new Uint8Array(this.mem);
        this.floats = new Float32Array(this.mem);
        this.ints = new Uint32Array(this.mem);
        if (typeof arg === 'number') {
            const memSize = arg;
            const freeDataMemPtr = dataSectorByteOffset;
            this.systemSector.set([
                id,
                SoftController.version,
                memSize,
                freeDataMemPtr,
                datablockTableOffset,
                datablockTableLength,
                0,
                0
            ]);
        }
        this.functionLibraries = [
            LogicLib
        ];
    }
    set id(value) { this.systemSector[0 /* id */] = value; }
    set version(value) { this.systemSector[1 /* version */] = value; }
    set totalMemSize(value) { this.systemSector[2 /* totalMemSize */] = value; }
    set freeDataMemPtr(value) { this.systemSector[3 /* freeDataMemPtr */] = value; }
    set datablockTablePtr(value) { this.systemSector[4 /* datablockTablePtr */] = value; }
    set datablockTableLength(value) { this.systemSector[5 /* datablockTableLength */] = value; }
    set datablockTableVersion(value) { this.systemSector[6 /* datablockTableVersion */] = value; }
    set mainTaskPtr(value) { this.systemSector[7 /* mainTaskPtr */] = value; }
    get id() { return this.systemSector[0 /* id */]; }
    get version() { return this.systemSector[1 /* version */]; }
    get totalMemSize() { return this.systemSector[2 /* totalMemSize */]; }
    get freeDataMemPtr() { return this.systemSector[3 /* freeDataMemPtr */]; }
    get datablockTablePtr() { return this.systemSector[4 /* datablockTablePtr */]; }
    get datablockTableLength() { return this.systemSector[5 /* datablockTableLength */]; }
    get datablockTableVersion() { return this.systemSector[6 /* datablockTableVersion */]; }
    get mainTaskPtr() { return this.systemSector[7 /* mainTaskPtr */]; }
    get totalDataMemSize() { return this.totalMemSize - this.bytes.byteOffset; }
    get freeMem() { return this.totalDataMemSize - this.freeDataMemPtr; }
    createFunction(library, opcode, inputCount, outputCount) {
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
        const ioCount = inputCount + outputCount;
        let byteLength = sizeOfStruct(DatablockHeaderStruct); // Datablock header
        byteLength += sizeOfStruct(FunctionHeaderStruct); // Function header
        byteLength += alignBytes(ioCount); // IO flags
        byteLength += inputCount * 4; // Input references
        byteLength += (ioCount + func.staticCount) * 4; // IO and static values
        const dataBlockHeader = {
            byteLength,
            type: DatablockType.FUNCTION,
            flags: 0,
            reserve: 0
        };
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
        let offset = writeStruct(buffer, 0, DatablockHeaderStruct, dataBlockHeader); // Write data block header
        offset += writeStruct(buffer, offset, FunctionHeaderStruct, funcHeader); // Write function header
        func.inputs.forEach(input => data.setUint8(offset++, input.flags)); // Write input flags
        if (inputCount > func.inputs.length) {
            const copyCount = inputCount - func.inputs.length;
            const flags = func.inputs[func.inputs.length - 1].flags;
            for (let i = 0; i < copyCount; i++)
                data.setUint8(offset++, flags);
        }
        func.outputs.forEach(output => data.setUint8(offset++, output.flags)); // Write output flags
        if (outputCount > func.outputs.length) {
            const copyCount = outputCount - func.outputs.length;
            const flags = func.outputs[func.outputs.length - 1].flags;
            for (let i = 0; i < copyCount; i++)
                data.setUint8(offset++, flags);
        }
        offset = alignBytes(offset); // align offset after flag bytes
        offset += inputCount * 4; // Skip input references
        func.inputs.forEach(input => {
            data.setFloat32(offset, input.initValue);
            offset += 4;
        });
        if (inputCount > func.inputs.length) {
            const copyCount = inputCount - func.inputs.length;
            const value = func.inputs[func.inputs.length - 1].initValue;
            for (let i = 0; i < copyCount; i++) {
                data.setFloat32(offset, value);
                offset += 4;
            }
        }
        func.outputs.forEach(output => {
            data.setFloat32(offset, output.initValue);
            offset += 4;
        });
        if (outputCount > func.outputs.length) {
            const copyCount = outputCount - func.outputs.length;
            const value = func.outputs[func.outputs.length - 1].initValue;
            for (let i = 0; i < copyCount; i++) {
                data.setFloat32(offset, value);
                offset += 4;
            }
        }
        return this.addDatablock(buffer);
    }
    // Add data block to controller memory
    addDatablock(data) {
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
        const offset = this.freeDataMemPtr;
        this.bytes.set(dataBytes, offset);
        this.freeDataMemPtr += data.byteLength;
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
            staticCount: this.bytes[byteOffset + 4],
            funcFlags: this.bytes[byteOffset + 5],
            reserve: 0
        };
    }
    getFunctionDataMap(id, header) {
        header = header || this.getFunctionHeader(id);
        const flags = this.datablockTable[id] + datablockHeaderByteLength + functionHeaderByteLength;
        const inputRefs = alignBytes(flags + header.inputCount + header.outputCount) / 4;
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
        const header = this.getFunctionHeader(id);
        const pointers = this.getFunctionDataMap(id, header);
        return pointers.inputs + ioNum;
    }
    getFunctionInputRefPointer(id, inputRefNum) {
        const header = this.getFunctionHeader(id);
        const pointers = this.getFunctionDataMap(id, header);
        return pointers.inputRefs + inputRefNum;
    }
    connectFuncInput(funcId, inputNum, sourceFuncId, sourceIONum) {
        const sourceIOPointer = this.getFunctionIOPointer(sourceFuncId, sourceIONum);
        const inputRefPointer = this.getFunctionInputRefPointer(funcId, inputNum);
        this.ints[inputRefPointer] = sourceIOPointer;
    }
    runFunction(id, dt) {
        const header = this.getFunctionHeader(id);
        const pointers = this.getFunctionDataMap(id, header);
        // update input values from input references
        for (let i = 0; i < header.inputCount; i++) {
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
        const params = {
            inputCount: header.inputCount,
            outputCount: header.outputCount,
            staticCount: header.staticCount,
            input: pointers.inputs,
            output: pointers.outputs,
            static: pointers.statics,
            dt
        };
        const func = this.functionLibraries[header.library].functions[header.opcode];
        func.run(params, this.floats);
    }
}
SoftController.version = 1;
