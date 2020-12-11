import SoftController from './SoftController.js';
import { DatablockType } from './SoftTypes.js';
export function createControllerBlueprint(cpu) {
    const datablocks = {};
    const taskCount = cpu.taskList.indexOf(0);
    const taskRefs = Array.from(cpu.taskList.slice(0, taskCount));
    const taskList = taskRefs.map(ref => createTaskDefinition(cpu, ref));
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
                };
            }
        }
    }
    const blueprint = {
        systemSector: {
            id: cpu.id,
            version: SoftController.version,
            totalMemSize: cpu.totalMemSize,
            datablockTableLength: cpu.datablockTableLength,
            taskListLength: cpu.taskListLength
        },
        taskList,
        datablocks
    };
    return blueprint;
}
// TASK
function createTaskDefinition(cpu, taskRef) {
    const task = cpu.getTask(taskRef);
    return {
        targetID: cpu.getDatablockIDbyRef(task.targetRef),
        interval: task.interval,
        offset: task.offset
    };
}
// CIRCUIT
function createCircuitDefinition(cpu, ref) {
    return {
        ...createFunctionDefinition(cpu, ref),
        callList: Array.from(cpu.readCircuitCallList(ref)).map(callRef => cpu.getDatablockIDbyRef(callRef)),
        outputRefs: Array.from(cpu.readCircuitOutputRefs(ref)).map(ioRef => cpu.solveIOReference(ioRef))
    };
}
// FUNCTION
function createFunctionDefinition(cpu, ref) {
    const funcHeader = cpu.readFunctionHeader(ref);
    return {
        library: funcHeader.library,
        opcode: funcHeader.opcode,
        inputCount: funcHeader.inputCount,
        outputCount: funcHeader.outputCount,
        staticCount: funcHeader.staticCount,
        ioFlags: Array.from(cpu.readFunctionIOFlags(ref)),
        ioValues: Array.from(cpu.readFunctionIOValues(ref)),
        inputRefs: Array.from(cpu.readFunctionInputRefs(ref)).map(ioRef => cpu.solveIOReference(ioRef)),
    };
}
