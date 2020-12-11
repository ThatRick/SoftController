import SoftController from './SoftController.js'
import {IORef,  DatablockType} from './SoftTypes.js'

interface IFunctionDefinition
{
    library:        number
    opcode:         number
    inputCount:     number
    outputCount:    number
    staticCount:    number
    ioFlags:        number[]
    ioValues:       number[]
    inputRefs:      IORef[]
}

interface ICircuitDefinition extends IFunctionDefinition
{
    callList:       number[]
    outputRefs:     IORef[]
}

interface IDatablockDefinition
{
    type:   DatablockType
    body:   IFunctionDefinition | ICircuitDefinition 
}

interface IDatablockTable
{
    [index: number]: IDatablockDefinition
}

interface IControllerBlueprint
{
    systemSector:       IControllerDefinition
    taskList:           ITaskDefinition[]
    datablocks:         IDatablockTable
}

interface IControllerDefinition
{
    id:                     number
    version:                number
    totalMemSize:           number
    datablockTableLength:   number
    taskListLength:         number
}

interface ITaskDefinition
{
    targetID:   number
    interval:   number
    offset:     number
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
    return {
        ...createFunctionDefinition(cpu, ref),
        callList:   Array.from(cpu.readCircuitCallList(ref)).map(callRef => cpu.getDatablockIDbyRef(callRef)),
        outputRefs: Array.from(cpu.readCircuitOutputRefs(ref)).map(ioRef => cpu.solveIOReference(ioRef))
    }
}

// FUNCTION
function createFunctionDefinition(cpu: SoftController, ref: number): IFunctionDefinition {
    const funcHeader = cpu.readFunctionHeader(ref)
    return {
        library:        funcHeader.library,
        opcode:         funcHeader.opcode,
        inputCount:     funcHeader.inputCount,
        outputCount:    funcHeader.outputCount,
        staticCount:    funcHeader.staticCount,
        ioFlags:        Array.from(cpu.readFunctionIOFlags(ref)),
        ioValues:       Array.from(cpu.readFunctionIOValues(ref)),          
        inputRefs:      Array.from(cpu.readFunctionInputRefs(ref)).map(ioRef => cpu.solveIOReference(ioRef)),
    }        
}
