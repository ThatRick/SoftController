
import {readStruct, writeStruct} from './TypedStructs.js'
import {ID, IO_FLAG, DatablockType} from './SoftTypes.js'
import {IFunctionHeader, FunctionHeaderStruct, functionHeaderByteLength, IFunctionParams} from './SoftTypes.js'
import {IDatablockHeader, DatablockHeaderStruct, datablockHeaderByteLength} from './SoftTypes.js'
import {ITask, TaskStruct, taskStructByteLength} from './SoftTypes.js'
import {IFunctionLibrary} from './SoftTypes.js'
import {LogicLib} from './SoftFuncLib.js'

const BYTES_PER_VALUE = 4
const BYTES_PER_REF = 4
/*
    ///// MEMORY LAYOUT //////
    System sector:      Uint32Array     (Controller info)
    Data block table:   Uint32Array     (Datablock references)
    Task list:          Uint32Array     (Task references)
    Data sector:                        (Data Blocks)
*/


function alignBytes(addr: number, bytes = BYTES_PER_VALUE) {
    return Math.ceil(addr / bytes) * bytes;
}

// SYSTEM SECTOR [array of uint32]
const enum SystemSector {
    id,
    version,
    totalMemSize,
    datablockTablePtr,
    datablockTableLength,
    dataBlockTableLastUsedID,
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
    
    mem:                ArrayBuffer

    systemSector:       Uint32Array
    datablockTable:     Uint32Array
    taskList:           Uint32Array

    private bytes:      Uint8Array
    private words:      Uint16Array
    private ints:       Uint32Array
    private floats:     Float32Array

    functionLibraries: IFunctionLibrary[]

    logLine(...args: any[]) { console.log(args) };

    // Constructors
    constructor(existingMem: ArrayBuffer);
    constructor(dataMemSize: number, datablockTableLength?: number, taskListLength?: number, id?: number);
    constructor(arg: number | ArrayBuffer, datablockTableLength: number = 1024, taskListLength: number = 16, id: number = 1)
    {
        // arg = ArrayBuffer: Use existing ArrayBuffer as controller memory data
        if (typeof arg === 'object') {
            this.mem = arg;
        }
        // arg = data memory size: Create new ArrayBuffer for controller memory data
        else if (typeof arg === 'number') {
            const totalMemSize = arg + (systemSectorLength + datablockTableLength + taskListLength) * Uint32Array.BYTES_PER_ELEMENT;
            this.mem = new ArrayBuffer(totalMemSize);
        }
        
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
            const dataMemSize = arg
    
            this.id = id;
            this.version = SoftController.version;
            this.totalMemSize = this.mem.byteLength;
            this.datablockTablePtr = datablockTableOffset;
            this.datablockTableLength = datablockTableLength;
            this.datablockTableVersion = 0;
            this.taskListPtr = taskListOffset;
            this.taskListLength = taskListLength;

            // Write initial data block for unallocated data memory
            this.markUnallocatedMemory(dataSectorByteOffset, dataMemSize)
        }

        // Load function libraries
        this.functionLibraries = [
            LogicLib
        ]
    }

    set id(value: number)                           { this.systemSector[SystemSector.id] = value }
    set version(value: number)                      { this.systemSector[SystemSector.version] = value }
    set totalMemSize(value: number)                 { this.systemSector[SystemSector.totalMemSize] = value }
    set datablockTablePtr(value: number)            { this.systemSector[SystemSector.datablockTablePtr] = value }
    set datablockTableLength(value: number)         { this.systemSector[SystemSector.datablockTableLength] = value }
    set datablockTableVersion(value: number)        { this.systemSector[SystemSector.datablockTableVersion] = value }
    set datablockTableLastUsedID(value: number)  { this.systemSector[SystemSector.dataBlockTableLastUsedID] = value }
    set taskListPtr(value: number)                  { this.systemSector[SystemSector.taskListPtr] = value }
    set taskListLength(value: number)               { this.systemSector[SystemSector.taskListLength] = value }

    get id()                                        { return this.systemSector[SystemSector.id] }
    get version()                                   { return this.systemSector[SystemSector.version] }
    get totalMemSize()                              { return this.systemSector[SystemSector.totalMemSize] }
    get datablockTablePtr()                         { return this.systemSector[SystemSector.datablockTablePtr] }
    get datablockTableLength()                      { return this.systemSector[SystemSector.datablockTableLength] }
    get datablockTableVersion()                     { return this.systemSector[SystemSector.datablockTableVersion] }
    get datablockTableLastUsedID()               { return this.systemSector[SystemSector.dataBlockTableLastUsedID] }
    get taskListPtr()                               { return this.systemSector[SystemSector.taskListPtr] }
    get taskListLength()                            { return this.systemSector[SystemSector.taskListLength] }

    get freeMem() { return undefined } // must sum unallocated datablocks


    // Process controller tasks
    tick(dt: number)
    {
        for (const taskRef of this.taskList) {
            if (taskRef == 0) break;
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
                // console.log('Task cpu time (ms):', elapsedTime);
                task.cpuTime += elapsedTime;
                if (task.cpuTime > 1.0) {
                    task.cpuTime--;
                    task.cpuTimeInt++;
                }
                task.runCount++
            }
            const taskByteOffset = taskRef + datablockHeaderByteLength;
            writeStruct(this.mem, taskByteOffset, TaskStruct, task);
        }
    }

    createTask(targetID: ID, interval: number, offset = 0, index?: number) {
        // check last 
        const vacantIndex = this.taskList.findIndex(value => (value == 0));
        if (vacantIndex == -1) {
            console.error('Task list is full');
            return -1;
        }

        const targetRef = this.datablockTable[targetID];
        const task: ITask = {
            targetRef,              // Reference of callable circuit or function 
            interval,               // time interval between calls (ms)
            offset,                 // time offset to spread cpu load between tasks with same interval (ms)
            timeAccu:   offset,     // time accumulator (ms)
            cpuTime:    0,          // counts cpu milliseconds. Whole numbers are subracted and added to cpuTimeInt            
            cpuTimeInt: 0,          // counts whole number of cpu milliseconds
            runCount:   0,          // counts number of calls
        }
        const buffer = new ArrayBuffer(taskStructByteLength);
        writeStruct(buffer, 0, TaskStruct, task);

        const taskID = this.addDatablock(DatablockType.TASK, buffer);
        if (taskID == -1) {
            console.error('Fault creating task');
            return -1;
        }

        const taskRef = this.datablockTable[taskID];

        if (index === undefined) {
            this.taskList[vacantIndex] = taskRef;                       // append new task
        }
        else {
            this.taskList.copyWithin(index+1, index, vacantIndex-1);    // shift existing tasks
            this.taskList[index] = taskRef;                             // set new task to specified index
        }

        return taskID
    }

    getTaskByID(id: ID): ITask {
        let taskRef = this.datablockTable[id];
        return this.getTask(taskRef);
    }
    getTask(taskRef: number): ITask {
        let taskByteOffset = taskRef + datablockHeaderByteLength;
        return readStruct<ITask>(this.mem, taskByteOffset, TaskStruct);        
    }

    calcCircuitSize(inputCount: number, outputCount: number, functionCount: number): number {
        const ioCount = inputCount + outputCount
        let byteLength = functionHeaderByteLength               // Function header
        byteLength = alignBytes(byteLength + ioCount)           // IO flags
        byteLength += inputCount * BYTES_PER_REF                // Input references
        byteLength += ioCount * BYTES_PER_VALUE                 // IO values
        byteLength += functionCount * BYTES_PER_REF             // function calls
        byteLength += outputCount * BYTES_PER_REF               // output references
        return byteLength;
    }

    // Creates a new circuit data block
    createCircuit(inputCount: number, outputCount: number, functionCount: number): ID {

        const funcHeader: IFunctionHeader = {
            library: 0,
            opcode: 0,
            inputCount,
            outputCount,
            staticCount: functionCount,
            funcFlags: 0,
            reserve: 0
        }

        const byteLength = this.calcCircuitSize(inputCount, outputCount, functionCount);

        const buffer = new ArrayBuffer(byteLength)
        const bytes = new Uint8Array(buffer)

        let offset = writeStruct(buffer, 0, FunctionHeaderStruct, funcHeader)       // Write function header
        
        bytes.fill(IO_FLAG.HIDDEN, offset, offset+inputCount+outputCount)           // Write IO flags (hidden by default)

        return this.addDatablock(DatablockType.CIRCUIT, buffer)
    }

    defineCircuitIO(id: ID, ioNum: number, flags: number, value: number = 0) {
        const circHeader = this.getFunctionHeaderByID(id);

        if (ioNum < 0 || ioNum >= circHeader.inputCount + circHeader.outputCount) {
            console.error('Invalid circuit IO index', ioNum);
            return false;
        }
        const pointers = this.getFunctionDataMapByID(id, circHeader);
        
        this.bytes[pointers.flags + ioNum] = flags;
        this.floats[pointers.inputs + ioNum] = value;
        return true;
    }

    // Adds function call to circuit
    addFunctionCall(circuitID: ID, functionID: ID, index?: number): boolean {
        const circHeader = this.getFunctionHeaderByID(circuitID);
        const pointers = this.getFunctionDataMapByID(circuitID, circHeader);

        const funcCallList = this.ints.subarray(pointers.statics, pointers.statics + circHeader.staticCount);

        // check last 
        const vacantIndex = funcCallList.findIndex(value => (value == 0));
        if (vacantIndex == -1) {
            console.error('Circuit function call list is full');
            return false;
        }

        const functionRef = this.datablockTable[functionID];

        if (index === undefined) {
            funcCallList[vacantIndex] = functionRef;                    // append new function call
        }
        else {
            funcCallList.copyWithin(index+1, index, vacantIndex-1);     // shift existing function calls
            funcCallList[index] = functionRef;                          // set new function call to specified index
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
        const func = lib.getFunction(opcode);

        inputCount = (func.variableInputCount && inputCount != undefined
            && (inputCount <= func.variableInputCount.max) && (inputCount >= func.variableInputCount.min))
            ? inputCount : func.inputs.length;

        outputCount = (func.variableOutputCount && outputCount != undefined
            && (outputCount <= func.variableOutputCount.max) && (outputCount >= func.variableOutputCount.min))
            ? outputCount : func.outputs.length;

        staticCount = (func.variableStaticCount && staticCount != undefined
            && (staticCount <= func.variableStaticCount.max) && (staticCount >= func.variableStaticCount.min))
            ? staticCount : func.staticCount || 0;

        const ioCount = inputCount + outputCount


        let byteLength = functionHeaderByteLength                   // Function header
        byteLength += alignBytes(ioCount)                           // IO flags
        byteLength += inputCount * BYTES_PER_REF                    // Input references
        byteLength += (ioCount + staticCount) * BYTES_PER_VALUE     // IO and static values

        const funcHeader: IFunctionHeader = {
            library,
            opcode,
            inputCount,
            outputCount,
            staticCount,
            funcFlags: 0,
            reserve: 0
        }

        const buffer = new ArrayBuffer(byteLength)
        writeStruct(buffer, 0, FunctionHeaderStruct, funcHeader)           // Write function header
        
        const flagsOffset = functionHeaderByteLength;
        const inputRefsOffset = alignBytes(flagsOffset + inputCount + outputCount);
        const ioValuesOffset = inputRefsOffset + inputCount * BYTES_PER_REF;

        const ioFlags = new Uint8Array(buffer, flagsOffset)
        const ioValues = new Float32Array(buffer, ioValuesOffset)

        const firstOutput = inputCount

        func.inputs.forEach((input, i) => {                                 // Initial input values and flags
            ioFlags[i] = input.flags
            ioValues[i] = input.initValue
        })
        if (inputCount > func.inputs.length) {                              // Variable input count reached by copying default input
            const lastInput = func.inputs[func.inputs.length - 1];
            for (let i = func.inputs.length; i < inputCount; i++) {
                ioFlags[i] = lastInput.flags;
                ioValues[i] = lastInput.initValue;
            }
        }
        func.outputs.forEach((output, i) => {                               // Initial output values and flags
            ioFlags[firstOutput + i] = output.flags
            ioValues[firstOutput + i] = output.initValue
        })
        if (outputCount > func.outputs.length) {                            // Variable output count reached by copying default output
            const lastOutput = func.outputs[func.outputs.length - 1];
            for (let i = func.outputs.length; i < outputCount; i++) {
                ioFlags[firstOutput + i] = lastOutput.flags;
                ioValues[firstOutput + i] = lastOutput.initValue;
            }
        }

        const id = this.addDatablock(DatablockType.FUNCTION, buffer)

        console.log(`for function ${Object.keys(lib.functions)[opcode]} [inputs ${inputCount}, outputs ${outputCount}, statics ${staticCount}]`);

        return id;
    }
    
    findPreviousDatablock(ref: number, type?: DatablockType): ID | undefined {
        let candidateID: ID
        let candidateOffset = Number.MAX_SAFE_INTEGER

        for (let id = 0; id < this.datablockTableLastUsedID; id++) {
            const candidateRef = this.datablockTable[id];
            const candidateType = this.getDatablockHeader(candidateRef).type;
            const offset = ref - candidateRef;
            if ((type == undefined || candidateType == type) && offset > 0 && offset < candidateOffset) {
                candidateOffset = offset;
                candidateID = id;
            }
        }
        return candidateID
    }

    findNextDatablock(ref: number, type?: DatablockType): ID | undefined {
        let candidateID: ID
        let candidateOffset = Number.MAX_SAFE_INTEGER

        for (let id = 0; id < this.datablockTableLastUsedID; id++) {
            const candidateRef = this.datablockTable[id];
            const candidateType = this.getDatablockHeader(candidateRef).type;
            const offset = candidateRef - ref;
            if ((type == undefined || candidateType == type) && offset > 0 && offset < candidateOffset) {
                candidateOffset = offset;
                candidateID = id;
            } 
        }
        return candidateID
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

    allocateDatablock(dataByteLength: number) {
        const candidates: {id: number, excessMem: number}[] = []
        const allocationByteLength = alignBytes(datablockHeaderByteLength + dataByteLength);
        for (let id = 0; id < this.datablockTable.length; id++) {
            const datablockRef = this.datablockTable[id];
            if (datablockRef == 0) break;
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
        }
    }

    markUnallocatedMemory(startByteOffset: number, byteLength: number) {
        let id: ID
        const nextBlockID = this.findNextDatablock(startByteOffset, DatablockType.UNALLOCATED);
        // If next data block in memory is unallocated then merge blocks
        if (nextBlockID) {
            id = nextBlockID;
            const nextBlockRef = this.datablockTable[nextBlockID];
            const nextBlockHeader = this.getDatablockHeader(nextBlockRef);
            byteLength = (nextBlockRef - startByteOffset) + nextBlockHeader.byteLength;
        }
        else {
            if (byteLength <= datablockHeaderByteLength) return;
            const id = this.getNewDatablockID();
            if (id == -1) return;
        }

        this.datablockTable[id] = startByteOffset;

        writeStruct(this.mem, startByteOffset, DatablockHeaderStruct, {
            byteLength,
            type: DatablockType.UNALLOCATED,
            flags: 0,
            reserve: 0
        } as IDatablockHeader)
    }
    
    unallocateDatablock(id: number) {
        const ref = this.datablockTable[id];
        const nextBlock = this.findNextDatablock(ref, DatablockType.UNALLOCATED);
        const prevBlock = this.findPreviousDatablock(ref, DatablockType.UNALLOCATED);
        
    }

    getIDforDatablockRef(ref: number) {
        const id = this.datablockTable.findIndex(ptr => ptr == ref);
        if (id == -1) {
            console.error('Invalid data block reference', ref);
        }
        return id;
    }

    // Remove or offset all references to given function or circuit
    udpdateReferencesToFunction(blockRef: number, offset?: number) {
        const funcHeader = this.getFunctionHeader(blockRef);
        const funcMap = this.getFunctionDataMap(blockRef, funcHeader);

        const ioRefStart = funcMap.inputs;
        const ioRefEnd = funcMap.statics - 1;

        for (let id = 0; id < this.datablockTableLastUsedID; id++) {
            const blockHeader = this.getDatablockHeaderByID(id);
            if (blockHeader.type == DatablockType.CIRCUIT) {            // Check if referenced in call list

            }
        }
    }

    deleteDatablock(id: ID) {
        // set data block type to UNALLOCATED
        const blockRef = this.datablockTableVersion[id];
        const blockHeader = this.getDatablockHeader(blockRef);

        if (blockHeader.type == DatablockType.CIRCUIT) {                // Delete circuit
            const circHeader = this.getFunctionHeader(blockRef);
            const circPointers = this.getFunctionDataMap(blockRef);
            const funcCallCount = circHeader.staticCount;
            const funcCalls = circPointers.statics;
            
            for (let i = 0; i < funcCallCount; i++)                     // Delete all functions in circuit call list
            {
                const callRef = this.ints[funcCalls + i];
                const callID = this.getIDforDatablockRef(callRef);
                if (callID == -1) continue;
                this.deleteDatablock(callID);
            }
        }
        if (blockHeader.type == DatablockType.FUNCTION || blockHeader.type == DatablockType.CIRCUIT) {

        }

        
        // zero fill after header
        
        // find data block references and set null
        // should function blocks have parent circuit id to narrow down search?

        // find IO value references and set null
        // calculate IO values start and end range and compare to siblings' input refs and parent circuit output refs
    }

    // Adds data block to controller memory and reference to data block table
    addDatablock(type: DatablockType, data: ArrayBuffer): ID {
    
        const allocation = this.allocateDatablock(data.byteLength);
        if (!allocation) {
            console.error('Could not create new data block');
            return -1;
        }

        const dataBlockHeader: IDatablockHeader = {
            byteLength: allocation.byteLength,
            type,
            flags: 0,
            reserve: 0
        }

        const dataBytes = new Uint8Array(data);
        
        const offset = writeStruct(this.mem, allocation.startByteOffset, DatablockHeaderStruct, dataBlockHeader)     // Write data block header
        
        this.bytes.set(dataBytes, offset);      // Write data block body
        
        console.log(`Created data block id ${allocation.id}, size ${allocation.byteLength} bytes, offset ${allocation.startByteOffset}`)

        return allocation.id;
    }

    getDatablockHeaderByID(id: ID): IDatablockHeader {
        let datablockRef = this.datablockTable[id];
        return this.getDatablockHeader(datablockRef);
    }
    getDatablockHeader(datablockRef: number): IDatablockHeader {
        return readStruct(this.mem, datablockRef, DatablockHeaderStruct) as unknown as IDatablockHeader;
    }

    getFunctionHeaderByID(id: ID): IFunctionHeader {
        let datablockRef = this.datablockTable[id];
        return this.getFunctionHeader(datablockRef);
    }
    // Optimized version! Any struct change will break this
    getFunctionHeader(datablockRef: number): IFunctionHeader {
        const byteOffset = datablockRef + datablockHeaderByteLength;
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

    getFunctionDataMapByID(id: ID, header?: IFunctionHeader)
    {
        const datablockRef = this.datablockTable[id];
        return this.getFunctionDataMap(datablockRef, header)
    }
    getFunctionDataMap(datablockRef: number, header?: IFunctionHeader)
    {
        header = header || this.getFunctionHeader(datablockRef);

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
        }  
    }

    getFunctionIOPointer(id: ID, ioNum: number) {
        const pointers = this.getFunctionDataMapByID(id);
        return pointers.inputs + ioNum;
    }

    getFunctionInputRefPointer(id: ID, inputRefNum: number) {
        const pointers = this.getFunctionDataMapByID(id);
        return pointers.inputRefs + inputRefNum;        
    }

    getCircuitOutputRefPointer(id: ID, outputRefNum: number) {
        const header = this.getFunctionHeaderByID(id);
        const pointers = this.getFunctionDataMapByID(id, header);
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

    runFunction(datablockRef: ID, dt: number) {
        const datablockHeader = this.getDatablockHeader(datablockRef);
        const functionHeader = this.getFunctionHeader(datablockRef);
        const pointers = this.getFunctionDataMap(datablockRef, functionHeader);
        
        for (let i = 0; i < functionHeader.inputCount; i++) {           // update input values from input references
            const inputRef = this.ints[pointers.inputRefs + i];
            const ioFlag = this.bytes[pointers.flags + i];
            if (inputRef > 0) {
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
        
        if (datablockHeader.type == DatablockType.FUNCTION)             // Run function
        {
            const lib = this.functionLibraries[functionHeader.library];
            const func = lib.getFunction(functionHeader.opcode);

            const params: IFunctionParams = {
                inputCount:     functionHeader.inputCount,
                outputCount:    functionHeader.outputCount,
                staticCount:    functionHeader.staticCount,
                input:          pointers.inputs,
                output:         pointers.outputs,
                static:         pointers.statics,
                dt
            }
            // TESTING
            func.run(params, this.floats);
        }

        else if (datablockHeader.type == DatablockType.CIRCUIT)         // Run circuit
        {
            const funcCallCount = functionHeader.staticCount;
            const funcCalls = pointers.statics;
            const outputRefs = funcCalls + functionHeader.staticCount;
            
            for (let i = 0; i < funcCallCount; i++)                     // Call functions in circuit call list
            {
                const callRef = this.ints[funcCalls + i];
                this.runFunction(callRef, dt);
            }
            
            const outputFlags = pointers.flags + functionHeader.inputCount;
            
            for (let i = 0; i < functionHeader.outputCount; i++)        // Update circuit outputs from output references
            {
                const outputRef = this.ints[outputRefs + i];
                const ioFlag = this.bytes[outputFlags + i];
                if (outputRef > 0) {
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