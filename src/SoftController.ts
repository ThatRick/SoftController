
import {DataType, StructType, sizeOfStruct, sizeOfType, readStruct, writeStruct} from './TypedStructs'
import {IDatablockHeader, ID, DatablockType, DatablockHeaderStruct, IFunctionHeader, FunctionHeaderStruct, IFunctionLibrary, IFunctionParams, datablockHeaderByteLength, functionHeaderByteLength, IO_FLAG} from './SoftTypes'
import {LogicLib} from './SoftFuncLib'

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

function alignBytes(addr: number, bytes = 4) {
    return Math.ceil(addr / bytes) * bytes;
}

// SYSTEM SECTOR [array of uint32]
const enum SystemSector {
    id,
    version,
    totalMemSize,
    freeDataMemPtr,
    datablockTablePtr,
    datablockTableLength,
    datablockTableVersion,
    mainTaskPtr
}
const SystemSectorLength = 9


//////////////////////////////////
//      Soft Controller
//////////////////////////////////

export default class SoftController
{
    static readonly version = 1
    private mem: ArrayBuffer

    private systemSector: Uint32Array
    private datablockTable: Uint32Array

    private bytes: Uint8Array
    private floats: Float32Array
    private ints: Uint32Array

    private functionLibraries: IFunctionLibrary[]

    public logLine: (string) => void = (line: string) => console.log(line);

    constructor(existingMem: ArrayBuffer);
    constructor(memSize: number, datablockTableLength?: number, id?: number);
    constructor(arg: number | ArrayBuffer, datablockTableLength: number = 256, id: number = 1)
    {
        this.mem = (typeof arg === 'number') ? new ArrayBuffer(arg) : arg;
        
        this.systemSector = new Uint32Array(this.mem, 0, SystemSectorLength)
        
        const datablockTableOffset = alignBytes(this.systemSector.byteLength);

        this.datablockTable = new Uint32Array(this.mem, datablockTableOffset, datablockTableLength);
        
        const dataSectorByteOffset = alignBytes(datablockTableOffset + this.datablockTable.byteLength);

        this.bytes = new Uint8Array(this.mem);
        this.floats = new Float32Array(this.mem);
        this.ints = new Uint32Array(this.mem);
        
        if (typeof arg === 'number') {
            const memSize = arg
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
            ])
        }

        this.functionLibraries = [
            LogicLib
        ]
    }

    set id(value: number)                       { this.systemSector[SystemSector.id] = value }
    set version(value: number)                  { this.systemSector[SystemSector.version] = value }
    set totalMemSize(value: number)             { this.systemSector[SystemSector.totalMemSize] = value }
    set freeDataMemPtr(value: number)           { this.systemSector[SystemSector.freeDataMemPtr] = value }
    set datablockTablePtr(value: number)        { this.systemSector[SystemSector.datablockTablePtr] = value }
    set datablockTableLength(value: number)     { this.systemSector[SystemSector.datablockTableLength] = value }
    set datablockTableVersion(value: number)    { this.systemSector[SystemSector.datablockTableVersion] = value }
    set mainTaskPtr(value: number)              { this.systemSector[SystemSector.mainTaskPtr] = value }

    get id()                                    { return this.systemSector[SystemSector.id] }
    get version()                               { return this.systemSector[SystemSector.version] }
    get totalMemSize()                          { return this.systemSector[SystemSector.totalMemSize] }
    get freeDataMemPtr()                        { return this.systemSector[SystemSector.freeDataMemPtr] }
    get datablockTablePtr()                     { return this.systemSector[SystemSector.datablockTablePtr] }
    get datablockTableLength()                  { return this.systemSector[SystemSector.datablockTableLength] }
    get datablockTableVersion()                 { return this.systemSector[SystemSector.datablockTableVersion] }
    get mainTaskPtr()                           { return this.systemSector[SystemSector.mainTaskPtr] }

    get totalDataMemSize() { return this.totalMemSize - this.bytes.byteOffset }
    get freeMem() { return this.totalDataMemSize - this.freeDataMemPtr }


    createFunction(library: number, opcode: number, inputCount?: number, outputCount?: number): ID
    {
        if (library >= this.functionLibraries.length) {
            console.error('Invalid function library id', library); return null;
        }
        const lib = this.functionLibraries[library];
        if (opcode >= Object.keys(lib.functions).length) {
            console.error('Invalid function opcode', opcode); return null;
        }
        const func = lib.functions[opcode];

        console.log('Creating function', Object.keys(lib)[opcode]);

        inputCount = (func.variableInputCount && inputCount
            && (inputCount <= func.variableInputCount.max) && (inputCount >= func.variableInputCount.min)) ? inputCount : func.inputs.length;

        outputCount = (func.variableOutputCount && outputCount
            && (outputCount <= func.variableOutputCount.max) && (outputCount >= func.variableOutputCount.min)) ? outputCount : func.outputs.length;

        const ioCount = inputCount + outputCount

        let byteLength = sizeOfStruct(DatablockHeaderStruct)    // Datablock header
        byteLength += sizeOfStruct(FunctionHeaderStruct)        // Function header
        byteLength += alignBytes(ioCount)                       // IO flags
        byteLength += inputCount * 4                            // Input references
        byteLength += (ioCount + func.staticCount) * 4          // IO and static values

        const dataBlockHeader: IDatablockHeader = {
            byteLength,
            type: DatablockType.FUNCTION,
            flags: 0,
            reserve: 0
        }

        const funcHeader: IFunctionHeader = {
            library,
            opcode,
            inputCount,
            outputCount,
            staticCount: func.staticCount,
            funcFlags: 0,
            reserve: 0
        }

        const buffer = new ArrayBuffer(byteLength)
        const data = new DataView(buffer)

        let offset = writeStruct(buffer, 0, DatablockHeaderStruct, dataBlockHeader)     // Write data block header
        offset += writeStruct(buffer, offset, FunctionHeaderStruct, funcHeader)         // Write function header

        func.inputs.forEach(input => data.setUint8(offset++, input.flags));             // Write input flags
        if (inputCount > func.inputs.length) {
            const copyCount = inputCount - func.inputs.length;
            const flags = func.inputs[func.inputs.length - 1].flags;
            for (let i = 0; i < copyCount; i++)
                data.setUint8(offset++, flags);
        }

        func.outputs.forEach(output => data.setUint8(offset++, output.flags));          // Write output flags
        if (outputCount > func.outputs.length) {
            const copyCount = outputCount - func.outputs.length;
            const flags = func.outputs[func.outputs.length - 1].flags;
            for (let i = 0; i < copyCount; i++)
                data.setUint8(offset++, flags);
        }

        offset = alignBytes(offset)                                                     // align offset after flag bytes

        offset += inputCount * 4                                                        // Skip input references

        func.inputs.forEach(input => {                                                  // Write input values
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

        func.outputs.forEach(output => {                                                // Write output values
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

        return this.addDatablock(buffer)
    }

    // Add data block to controller memory
    addDatablock(data: ArrayBuffer): ID {
        
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

    getDatablockHeader(id: ID): IDatablockHeader {
        let byteOffset = this.datablockTable[id];
        return readStruct(this.mem, byteOffset, DatablockHeaderStruct) as unknown as IDatablockHeader;
    }
/* 
    getFunctionHeader(id: ID): IFunctionHeader {
        let byteOffset = this.datablockTable[id] + datablockHeaderByteLength;
        return readStruct(this.mem, byteOffset, FunctionHeaderStruct) as unknown as IFunctionHeader;
    }
*/
    // Optimized version! Any struct change will break this
    getFunctionHeader(id: ID): IFunctionHeader {
        let byteOffset = this.datablockTable[id] + datablockHeaderByteLength;
        return {
            library:        this.bytes[byteOffset + 0],
            opcode:         this.bytes[byteOffset + 1],
            inputCount:     this.bytes[byteOffset + 2],
            outputCount:    this.bytes[byteOffset + 3],
            staticCount:    this.bytes[byteOffset + 4],
            funcFlags:      this.bytes[byteOffset + 5],
            reserve:        0
        }
    }

    getFunctionDataMap(id: ID, header?: IFunctionHeader)
    {
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
        }  
    }

    getFunctionIOPointer(id: ID, ioNum: number) {
        const header = this.getFunctionHeader(id);
        const pointers = this.getFunctionDataMap(id, header);
        return pointers.inputs + ioNum;
    }

    getFunctionInputRefPointer(id: ID, inputRefNum: number) {
        const header = this.getFunctionHeader(id);
        const pointers = this.getFunctionDataMap(id, header);
        return pointers.inputRefs + inputRefNum;        
    }

    connectFuncInput(funcId: ID, inputNum: number, sourceFuncId: ID, sourceIONum: number) {
        const sourceIOPointer = this.getFunctionIOPointer(sourceFuncId, sourceIONum);
        const inputRefPointer = this.getFunctionInputRefPointer(funcId, inputNum);

        this.ints[inputRefPointer] = sourceIOPointer;
    }

    runFunction(id: ID, dt: number) {
        const header = this.getFunctionHeader(id);
        const pointers = this.getFunctionDataMap(id, header);
        
        // update input values from input references
        for (let i = 0; i < header.inputCount; i++) {
            const inputRef = this.ints[pointers.inputRefs + i];
            const ioFlag = this.bytes[pointers.flags + i]
            if (inputRef) {
                let value = this.floats[inputRef];
                if (ioFlag & IO_FLAG.BOOLEAN) {
                    value = ((value) ? 1 : 0) ^ (ioFlag & IO_FLAG.INVERTED)
                }
                else if (ioFlag & IO_FLAG.INTEGER) {
                    value = Math.floor(value)
                }
                this.floats[pointers.inputs + i] = value;
            }
        }
        
        const params: IFunctionParams = {
            inputCount:  header.inputCount,
            outputCount: header.outputCount,
            staticCount: header.staticCount,
            input:  pointers.inputs,
            output: pointers.outputs,
            static: pointers.statics,
            dt
        }
        
        const func = this.functionLibraries[header.library].functions[header.opcode];

        func.run(params, this.floats);
    }

}