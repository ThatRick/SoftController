
import {readStruct, writeStruct} from './TypedStructs'
import {ID, IO_FLAG, DatablockType} from './SoftTypes'
import {IFunctionHeader, FunctionHeaderStruct, functionHeaderByteLength, IFunctionParams} from './SoftTypes'
import {IDatablockHeader, DatablockHeaderStruct, datablockHeaderByteLength} from './SoftTypes'
import {ITask, TaskStruct, taskStructByteLength} from './SoftTypes'
import {IFunctionLibrary} from './SoftTypes'
import {LogicLib} from './SoftFuncLib'

const BYTES_PER_VALUE = 4
const BYTES_PER_REF = 4
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




function alignBytes(addr: number, bytes = BYTES_PER_VALUE) {
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
    taskListPtr,
    taskListLength,
}
const systemSectorLength = 9


//////////////////////////////////
//      Soft Controller
//////////////////////////////////

export default class SoftController
{
    static readonly version = 1
    
    private mem:            ArrayBuffer

    private systemSector:   Uint32Array
    private datablockTable: Uint32Array
    private taskList:       Uint32Array

    private bytes:          Uint8Array
    private words:          Uint16Array
    private ints:           Uint32Array
    private floats:         Float32Array

    private functionLibraries: IFunctionLibrary[]

    logLine(line: string) { console.log(line) };

    // Constructors
    constructor(existingMem: ArrayBuffer);
    constructor(memSize: number, datablockTableLength?: number, taskListLength?: number, id?: number);
    constructor(arg: number | ArrayBuffer, datablockTableLength: number = 1024, taskListLength: number = 16, id: number = 1)
    {
        // If memory size is given create new ArrayBuffer for controller memory data
        // else existing ArrayBuffer is given as controller memory data
        this.mem = (typeof arg === 'number') ? new ArrayBuffer(arg) : arg;
        
        this.bytes =    new Uint8Array(this.mem);
        this.words =    new Uint16Array(this.mem);
        this.ints =     new Uint32Array(this.mem);
        this.floats =   new Float32Array(this.mem);

        this.systemSector = new Uint32Array(this.mem, 0, systemSectorLength)

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
            const memSize = arg
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

            // prevent using zero index of data block table by adding dummy block
            this.addDatablock(DatablockType.DATA, new ArrayBuffer(0));
        }

        // Load function libraries
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
    set taskListPtr(value: number)              { this.systemSector[SystemSector.taskListPtr] = value }
    set taskListLength(value: number)           { this.systemSector[SystemSector.taskListLength] = value }

    get id()                                    { return this.systemSector[SystemSector.id] }
    get version()                               { return this.systemSector[SystemSector.version] }
    get totalMemSize()                          { return this.systemSector[SystemSector.totalMemSize] }
    get freeDataMemPtr()                        { return this.systemSector[SystemSector.freeDataMemPtr] }
    get datablockTablePtr()                     { return this.systemSector[SystemSector.datablockTablePtr] }
    get datablockTableLength()                  { return this.systemSector[SystemSector.datablockTableLength] }
    get datablockTableVersion()                 { return this.systemSector[SystemSector.datablockTableVersion] }
    get taskListPtr()                           { return this.systemSector[SystemSector.taskListPtr] }
    get taskListLength()                        { return this.systemSector[SystemSector.taskListLength] }

    get totalDataMemSize() { return this.totalMemSize - this.bytes.byteOffset }
    get freeMem() { return this.totalDataMemSize - this.freeDataMemPtr }

    
    // Process controller tasks
    tick(dt: number)
    {
        // Loop through tasks, break on null
        for (let i = 0; i < this.taskListLength; i++)
        {
            const taskID = this.ints[this.taskListPtr + i];
            if (taskID == null) break;
            // read task data
            let taskByteOffset = this.datablockTable[taskID] + datablockHeaderByteLength;
            const task = readStruct<ITask>(this.mem, taskByteOffset, TaskStruct);
            // add delta time to accumulator
            task.timeAccu += dt;
            if (task.timeAccu > task.interval) {
                task.timeAccu -= task.interval;
                // run target function / circuit
                const taskStartTime = performance.now();
                this.runFunction(task.targetID, task.interval);
                const elapsedTime = performance.now() - taskStartTime;
                // save performance data
                task.cpuTime += elapsedTime;
                if (task.cpuTime > 1) {
                    task.cpuTime--;
                    task.cpuTimeInt++;
                }
                task.runCount++
            }
            writeStruct(this.mem, taskByteOffset, TaskStruct, task);
        }
    }

    createTask(targetID: ID, interval: number, offset = 0) {
        const task: ITask = {
            targetID,               // ID of callable circuit or function 
            interval,               // time interval between calls (ms)
            offset,                 // time offset to spread cpu load between tasks with same interval (ms)
            timeAccu:   offset,     // time accumulator (ms)
            cpuTime:    0,          // counts cpu milliseconds. Whole numbers are subracted and added to cpuTimeInt            
            cpuTimeInt: 0,          // counts whole number of cpu milliseconds
            runCount:   0,          // counts number of calls
        }
        const buffer = new ArrayBuffer(taskStructByteLength);
        writeStruct(buffer, 0, TaskStruct, task);

        return this.addDatablock(DatablockType.TASK, buffer);
    }

    // Optimized version of reading task data (for benchmarking)
    // getTask(id: ID): ITask {
    //     let byteOffset = this.datablockTable[id] + datablockHeaderByteLength;
    //     assert(byteOffset % BYTES_PER_VALUE == 0);
    //     let pointer = byteOffset / BYTES_PER_VALUE;
    //     return {
    //         targetID:     this.ints[pointer + 0],
    //         interval:   this.floats[pointer + 1],
    //         offset:     this.floats[pointer + 2],
    //         timeAccu:   this.floats[pointer + 3],
    //         cpuTime:    this.floats[pointer + 4],
    //         cpuTimeInt:   this.ints[pointer + 5],
    //         runCount:     this.ints[pointer + 6],
    //     }
    // }

    // Creates a new circuit data block
    createCircuit(inputCount: number, outputCount: number, functionCount: number): ID {
        const ioCount = inputCount + outputCount

        let byteLength = functionHeaderByteLength               // Function header
        byteLength = alignBytes(byteLength + ioCount)           // IO flags
        byteLength += inputCount * BYTES_PER_REF                // Input references
        byteLength += ioCount * BYTES_PER_VALUE                 // IO values
        byteLength += functionCount * BYTES_PER_VALUE           // function calls
        byteLength += outputCount * BYTES_PER_VALUE             // output references

        const funcHeader: IFunctionHeader = {
            library: 0,
            opcode: 0,
            inputCount,
            outputCount,
            staticCount: functionCount,
            funcFlags: 0,
            reserve: 0
        }

        const buffer = new ArrayBuffer(byteLength)
        const bytes = new Uint8Array(buffer)

        let offset = writeStruct(buffer, 0, FunctionHeaderStruct, funcHeader)       // Write function header

        bytes.fill(IO_FLAG.HIDDEN, offset, offset+ioCount)                          // Write IO flags (hidden by default)
        
        return this.addDatablock(DatablockType.CIRCUIT, buffer)
    }

    defineCircuitIO(id: ID, index: number, flags: number, value: number = 0) {
        const circHeader = this.getFunctionHeader(id);

        if (index < 0 || index >= circHeader.inputCount + circHeader.outputCount) {
            console.error('Invalid circuit IO index', index);
            return false;
        }
        const pointers = this.getFunctionDataMap(id, circHeader);
        
        this.bytes[pointers.flags + index] = flags;
        this.floats[pointers.inputs + index] = value;
        return true;
    }

    // Adds function call to circuit
    addFunctionCall(circuitID: ID, functionID: ID, index?: number): boolean {
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
            funcCallList[vacantIndex] = functionID;                     // append new function call
        }
        else {
            funcCallList.copyWithin(index+1, index, vacantIndex-1);     // shift existing function calls
            funcCallList[index] = functionID;                           // set new function call to specified index
        }
        return true;
    }

    // Creates new function data block
    createFunctionBlock(library: number, opcode: number, inputCount?: number, outputCount?: number, staticCount?: number): ID
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

        staticCount = (func.variableStaticCount && staticCount
            && (staticCount <= func.variableStaticCount.max) && (staticCount >= func.variableStaticCount.min)) ? staticCount : func.staticCount;

        const ioCount = inputCount + outputCount

        let byteLength = functionHeaderByteLength                       // Function header
        byteLength += alignBytes(ioCount)                               // IO flags
        byteLength += inputCount * BYTES_PER_REF                        // Input references
        byteLength += (ioCount + func.staticCount) * BYTES_PER_VALUE    // IO and static values

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

        let offset = writeStruct(buffer, 0, FunctionHeaderStruct, funcHeader)           // Write function header

        func.inputs.forEach(input => data.setUint8(offset++, input.flags));             // Write input flags
        if (inputCount > func.inputs.length) {                                          // Variable input count reached by copying default input flags
            const copyCount = inputCount - func.inputs.length;
            const flags = func.inputs[func.inputs.length - 1].flags;
            for (let i = 0; i < copyCount; i++)
                data.setUint8(offset++, flags);
        }

        func.outputs.forEach(output => data.setUint8(offset++, output.flags));          // Write output flags
        if (outputCount > func.outputs.length) {                                        // Variable output count reached by copying default output flags
            const copyCount = outputCount - func.outputs.length;
            const flags = func.outputs[func.outputs.length - 1].flags;
            for (let i = 0; i < copyCount; i++)
                data.setUint8(offset++, flags);
        }

        offset = alignBytes(offset)                                                     // align offset after flag bytes

        offset += inputCount * BYTES_PER_REF                                            // Step over input references

        func.inputs.forEach(input => {                                                  // Write input values
            data.setFloat32(offset, input.initValue);                                   
            offset += BYTES_PER_VALUE;
        });
        if (inputCount > func.inputs.length) {                                          // Variable input count reached by copying default input value
            const copyCount = inputCount - func.inputs.length;
            const value = func.inputs[func.inputs.length - 1].initValue;
            for (let i = 0; i < copyCount; i++) {
                data.setFloat32(offset, value);
                offset += BYTES_PER_VALUE;
            }
        }

        func.outputs.forEach(output => {                                                // Write output values
            data.setFloat32(offset, output.initValue);                  
            offset += BYTES_PER_VALUE;
        });
        if (outputCount > func.outputs.length) {                                        // Variable output count reached by copying default output value
            const copyCount = outputCount - func.outputs.length;
            const value = func.outputs[func.outputs.length - 1].initValue;
            for (let i = 0; i < copyCount; i++) {
                data.setFloat32(offset, value);
                offset += BYTES_PER_VALUE;
            }
        }

        return this.addDatablock(DatablockType.FUNCTION, buffer)
    }

    // Adds data block to controller memory and reference to data block table
    addDatablock(type: DatablockType, data: ArrayBuffer): ID {
        
        const totalByteLength = datablockHeaderByteLength + data.byteLength;

        const dataBlockHeader: IDatablockHeader = {
            byteLength: totalByteLength,
            type,
            flags: 0,
            reserve: 0
        }

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
        offset += writeStruct(this.bytes, offset, DatablockHeaderStruct, dataBlockHeader)     // Write data block header

        this.bytes.set(dataBytes, offset);      // Write data block body

        this.freeDataMemPtr += totalByteLength;
        
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
            staticCount:    this.words[(byteOffset + 4) / 2],
            funcFlags:      this.bytes[byteOffset + 5],
            reserve:        0
        }
    }

    getFunctionDataMap(id: ID, header?: IFunctionHeader)
    {
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
        }  
    }

    getFunctionIOPointer(id: ID, ioNum: number) {
        const pointers = this.getFunctionDataMap(id);
        return pointers.inputs + ioNum;
    }

    getFunctionInputRefPointer(id: ID, inputRefNum: number) {
        const pointers = this.getFunctionDataMap(id);
        return pointers.inputRefs + inputRefNum;        
    }

    getCircuitOutputRefPointer(id: ID, outputRefNum: number) {
        const header = this.getFunctionHeader(id);
        const pointers = this.getFunctionDataMap(id, header);
        return pointers.statics + header.staticCount + outputRefNum;        
    }

    connectFunctionInput(funcId: ID, inputNum: number, sourceFuncId: ID, sourceIONum: number) {
        const sourceIOPointer = this.getFunctionIOPointer(sourceFuncId, sourceIONum);
        const inputRefPointer = this.getFunctionInputRefPointer(funcId, inputNum);

        this.ints[inputRefPointer] = sourceIOPointer;
    }

    connectCircuitOutput(circuitId: ID, outputNum: number, sourceFuncId: ID, sourceIONum: number) {
        const sourceIOPointer = this.getFunctionIOPointer(sourceFuncId, sourceIONum);
        const outputRefPointer = this.getCircuitOutputRefPointer(circuitId, outputNum);

        this.ints[outputRefPointer] = sourceIOPointer;
    }

    runFunction(id: ID, dt: number) {
        const dataBlockHeader = this.getDatablockHeader(id);
        const functionHeader = this.getFunctionHeader(id);
        const pointers = this.getFunctionDataMap(id, functionHeader);
        
        for (let i = 0; i < functionHeader.inputCount; i++) {           // update input values from input references
            const inputRef = this.ints[pointers.inputRefs + i];
            const ioFlag = this.bytes[pointers.flags + i];
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
        
        if (dataBlockHeader.type == DatablockType.FUNCTION)             // Run function
        {
            const func = this.functionLibraries[functionHeader.library].functions[functionHeader.opcode];

            const params: IFunctionParams = {
                inputCount:     functionHeader.inputCount,
                outputCount:    functionHeader.outputCount,
                staticCount:    functionHeader.staticCount,
                input:          pointers.inputs,
                output:         pointers.outputs,
                static:         pointers.statics,
                dt
            }
                
            func.run(params, this.floats);
        }

        else if (dataBlockHeader.type == DatablockType.CIRCUIT)         // Run circuit
        {
            const funcCallCount = functionHeader.staticCount;
            const funcCalls = pointers.statics;
            const outputRefs = funcCalls + functionHeader.staticCount;
            
            for (let i = 0; i < funcCallCount; i++)                     // Call functions in circuit call list
            {
                const funcID = this.ints[funcCalls + i];
                this.runFunction(funcID, dt);
            }
            
            const outputFlags = pointers.flags + functionHeader.inputCount;
            
            for (let i = 0; i < functionHeader.outputCount; i++)        // Update circuit outputs from output references
            {
                const outputRef = this.ints[outputRefs + i];
                const ioFlag = this.bytes[outputFlags + i];
                if (outputRef) {
                    let value = this.floats[outputRef];
                    if (ioFlag & IO_FLAG.BOOLEAN) {
                        value = (value) ? 1 : 0;
                    }
                    else if (ioFlag & IO_FLAG.INTEGER) {
                        value = Math.floor(value)
                    }
                    this.floats[pointers.outputs + i] = value;
                }
            }
        }

    }

}