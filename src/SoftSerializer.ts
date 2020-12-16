import SoftController from './SoftController.js'
import {IORef,  DatablockType, IFunction} from './SoftTypes.js'

interface IODefinition
{
    [index: number]: number
}

interface IORefDefinition
{
    [index: number]: IORef
}

interface IFunctionDefinition
{
    library:        number
    opcode:         number
    inputCount?:    number
    outputCount?:   number
    staticCount?:   number
    ioFlags?:       IODefinition
    ioValues?:      IODefinition
    inputRefs?:     IORefDefinition
}

interface ICircuitDefinition extends IFunctionDefinition
{
    callList:       number[]
    outputRefs?:    IORefDefinition
}

interface IDatablockDefinition
{
    type:           DatablockType
    body:           IFunctionDefinition | ICircuitDefinition 
}

interface IDatablockTable
{
    [index: number]: IDatablockDefinition
}

interface IControllerBlueprint
{
    systemSector:   IControllerDefinition
    taskList:       ITaskDefinition[]
    datablocks:     IDatablockTable
}

interface IControllerDefinition
{
    id:                     number
    version:                number
    totalMemSize:           number
    dataMemSize:            number
    datablockTableLength:   number
    taskListLength:         number
}

interface ITaskDefinition
{
    targetID:       number
    interval:       number
    offset:         number
}

export function loadControllerBlueprint(obj: Object): SoftController {
    const blueprint = obj as IControllerBlueprint;
    const memSize = 32 * 1024;
    const sys = blueprint.systemSector;
    console.log(sys);
    const cpu = new SoftController(sys.dataMemSize, sys.datablockTableLength, sys.taskListLength);
    return cpu;
}


export function createControllerBlueprint(cpu: SoftController) {

    const datablocks: IDatablockTable = {}
    
    const taskCount = cpu.taskList.indexOf(0);
    const taskRefs = Array.from(cpu.taskList.slice(0, taskCount));
    
    const taskList: ITaskDefinition[] = taskRefs.map(ref => createTaskDefinition(cpu, ref))

    for (let id = 0; id < cpu.datablockTableLastUsedID; id++) {
        const blockRef = cpu.datablockTable[id];
        if (blockRef) {
            const blockHeader = cpu.getDatablockHeader(blockRef);
            if (blockHeader.type == DatablockType.FUNCTION || blockHeader.type == DatablockType.CIRCUIT) {
                const body = (blockHeader.type == DatablockType.CIRCUIT) ? createCircuitDefinition(cpu, blockRef)
                                                                         : createFunctionDefinition(cpu, blockRef);

                datablocks[id] = {
                    type: blockHeader.type,
                    body
                }
            }
        }
    }
    
    const blueprint: IControllerBlueprint = {
        systemSector: {
            id:                     cpu.id,
            version:                SoftController.version,
            totalMemSize:           cpu.totalMemSize,
            dataMemSize:            cpu.dataMemSize,
            datablockTableLength:   cpu.datablockTableLength,
            taskListLength:         cpu.taskListLength
        },
        taskList,
        datablocks
    }

    return blueprint
}

// TASK
function createTaskDefinition(cpu: SoftController, taskRef: number): ITaskDefinition {
    const task = cpu.getTask(taskRef);
    return {
        targetID:   cpu.getDatablockIDbyRef(task.targetRef),
        interval:   task.interval,
        offset:     task.offset
    }
}

// CIRCUIT
function createCircuitDefinition(cpu: SoftController, ref: number): ICircuitDefinition {
    const funcHeader = cpu.readFunctionHeader(ref)

    const inputRefs = Array.from(cpu.readFunctionInputRefs(ref)).map(ioRef => cpu.solveIOReference(ioRef))
    const modifiedInputRefs = {}
    inputRefs.forEach((ref, i) => {
        if (ref) modifiedInputRefs[i] = ref;
    })

    const outputRefs = Array.from(cpu.readCircuitOutputRefs(ref)).map(ioRef => cpu.solveIOReference(ioRef))
    const modifiedOutputRefs = {}
    outputRefs.forEach((ref, i) => {
        if (ref) modifiedOutputRefs[i] = ref;
    })

    const circuitDef: ICircuitDefinition = {
        library:        0,
        opcode:         0,
        inputCount:     funcHeader.inputCount,
        outputCount:    funcHeader.outputCount,
        staticCount:    funcHeader.staticCount,
        ioFlags:        Array.from(cpu.readFunctionIOFlags(ref)),
        ioValues:       Array.from(cpu.readFunctionIOValues(ref)),
        callList:       Array.from(cpu.readCircuitCallList(ref)).map(callRef => cpu.getDatablockIDbyRef(callRef)),
    }

    if (Object.keys(modifiedInputRefs).length > 0)      circuitDef.inputRefs = modifiedInputRefs;
    if (Object.keys(modifiedOutputRefs).length > 0)     circuitDef.outputRefs = modifiedOutputRefs;
    
    return circuitDef;
}

// FUNCTION
function createFunctionDefinition(cpu: SoftController, ref: number): IFunctionDefinition {
    const funcHeader = cpu.readFunctionHeader(ref)
    
    const ioFlags = Array.from(cpu.readFunctionIOFlags(ref))
    const ioValues = Array.from(cpu.readFunctionIOValues(ref))
    const inputRefs = Array.from(cpu.readFunctionInputRefs(ref)).map(ioRef => cpu.solveIOReference(ioRef))

    const modifiedFlags = {}
    const modifiedValues = {}
    const modifiedInputRefs = {}
    
    const func = cpu.getFunction(funcHeader.library, funcHeader.opcode);

    // Modified inputs
    for (let i = 0; i < funcHeader.inputCount; i++) {
        const k = Math.min(i, func.inputs.length-1)
        if (ioFlags[i] != func.inputs[k].flags)         modifiedFlags[i] = ioFlags[i];
        if (ioValues[i] != func.inputs[k].initValue)    modifiedValues[i] = ioFlags[i];
    }

    // Modified outputs
    for (let i = funcHeader.inputCount; i < funcHeader.inputCount + funcHeader.outputCount; i++) {
        const k = Math.min(i - funcHeader.inputCount, func.outputs.length-1)
        if (ioFlags[i] != func.outputs[k].flags)         modifiedFlags[i] = ioFlags[i];
        if (ioValues[i] != func.outputs[k].initValue)    modifiedValues[i] = ioFlags[i];
    }

    // Defined input references
    inputRefs.forEach((ref, i) => {
        if (ref) modifiedInputRefs[i] = ref;
    })

    const funcDef: IFunctionDefinition =
    {
        library:        funcHeader.library,
        opcode:         funcHeader.opcode
    }       
    
    if (funcHeader.inputCount != func.inputs.length)    funcDef.inputCount = funcHeader.inputCount;
    if (funcHeader.outputCount != func.outputs.length)  funcDef.outputCount = funcHeader.outputCount;
    if (funcHeader.staticCount != func.staticCount)     funcDef.staticCount = funcHeader.staticCount;
    if (Object.keys(modifiedFlags).length > 0)          funcDef.ioFlags = modifiedFlags;
    if (Object.keys(modifiedValues).length > 0)         funcDef.ioValues = modifiedValues;
    if (Object.keys(modifiedInputRefs).length > 0)      funcDef.inputRefs = modifiedInputRefs;

    return funcDef
}
