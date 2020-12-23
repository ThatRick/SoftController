import SoftController, { getFunction } from './SoftController.js';
import { datablockHeaderByteLength, taskStructByteLength } from './SoftTypes.js';
export function loadControllerBlueprint(obj, spareDataMemSize = 0, spareDatablockCount = 0, spareTaskCount = 0) {
    const blueprint = obj;
    // Calculate needed data memory for data blocks
    let neededDataMemSize = datablockHeaderByteLength; // ID 0 is always an undefined data block
    neededDataMemSize += datablockHeaderByteLength; // last index is for unallocated memory data block
    Object.keys(blueprint.datablocks).forEach(id => {
        const block = blueprint.datablocks[id];
        neededDataMemSize += datablockSize(block);
    });
    const dataMemSize = neededDataMemSize + spareDataMemSize;
    const datablockTableLength = 2 + Object.keys(blueprint.datablocks).length + spareDatablockCount;
    const taskListLength = blueprint.taskList.length + spareTaskCount;
    console.log(`Loading controller (needed mem: ${dataMemSize} bytes, table size: ${datablockTableLength}, task list size: ${taskListLength})`);
    const cpu = new SoftController(dataMemSize, datablockTableLength, taskListLength);
    blueprint.taskList.forEach(taskID => {
        const block = blueprint.datablocks[taskID];
        const task = block.body;
        const taskOnlineID = cpu.createTask(0, task.interval, task.offset);
        const circOnlineID = loadCircuit(cpu, blueprint.datablocks, task.targetID);
        cpu.setTaskTarget(taskOnlineID, circOnlineID);
    });
    return cpu;
}
export function datablockSize(block) {
    let size = datablockHeaderByteLength;
    switch (block.type) {
        case 2 /* TASK */: {
            size += taskStructByteLength;
            break;
        }
        case 3 /* CIRCUIT */: {
            const circuitDef = block.body;
            size += SoftController.calcCircuitSize(circuitDef.inputCount, circuitDef.inputCount, circuitDef.staticCount);
            break;
        }
        case 4 /* FUNCTION */: {
            const funcDef = block.body;
            const funcTyp = getFunction(funcDef.library, funcDef.opcode);
            const inputCount = funcDef.inputCount || funcTyp.inputs.length;
            const outputCount = funcDef.outputCount || funcTyp.inputs.length;
            const staticCount = funcDef.staticCount || funcTyp.staticCount || 0;
            size += SoftController.calcFunctionSize(inputCount, outputCount, staticCount);
            break;
        }
    }
    return size;
}
export function loadCircuit(cpu, datablocks, circDefID, spareInputs = 0, spareOutputs = 0, spareFuncCalls = 0) {
    const block = datablocks[circDefID];
    if (block.type != 3 /* CIRCUIT */) {
        console.error('Load Circuit: Data block type invalid.');
        return;
    }
    const renumMap = new Map();
    const circDef = block.body;
    const inputCount = circDef.inputCount + spareInputs;
    const outputCount = circDef.outputCount + spareOutputs;
    const funcCallCount = circDef.staticCount + spareFuncCalls;
    const circOnlineID = cpu.createCircuit(inputCount, outputCount, funcCallCount);
    renumMap.set(circDefID, circOnlineID);
    // Create function calls
    circDef.callList.forEach(funcDefID => {
        const funcBlock = datablocks[funcDefID];
        if (funcBlock.type == 4 /* FUNCTION */) {
            const funcDef = funcBlock.body;
            const funcOnlineID = cpu.createFunctionBlock(funcDef.library, funcDef.opcode, circOnlineID, undefined, funcDef.inputCount, funcDef.outputCount, funcDef.staticCount);
            funcDef.ioValues && Object.keys(funcDef.ioValues).forEach(key => {
                const ioNum = Number(key);
                cpu.setFunctionIOValue(funcOnlineID, ioNum, funcDef.ioValues[key]);
            });
            funcDef.ioFlags && Object.keys(funcDef.ioFlags).forEach(key => {
                const ioNum = Number(key);
                cpu.setFunctionIOFlags(funcOnlineID, ioNum, funcDef.ioFlags[key]);
            });
            renumMap.set(funcDefID, funcOnlineID);
        }
        else if (funcBlock.type == 3 /* CIRCUIT */) {
            const circOnlineID = loadCircuit(cpu, datablocks, funcDefID);
            renumMap.set(funcDefID, circOnlineID);
        }
    });
    // Set function input references with renumbered IDs
    circDef.callList.forEach(funcDefID => {
        const onlineID = renumMap.get(funcDefID);
        const funcBlock = datablocks[funcDefID];
        const funcDef = funcBlock.body;
        funcDef.inputRefs && Object.keys(funcDef.inputRefs).forEach(key => {
            const inputNum = Number(key);
            const ioRef = funcDef.inputRefs[inputNum];
            const sourceOnlineID = renumMap.get(ioRef.id);
            cpu.connectFunctionInput(onlineID, inputNum, sourceOnlineID, ioRef.ioNum);
        });
    });
    // Create circuit output references with renumbered IDs
    circDef.outputRefs && Object.keys(circDef.outputRefs).forEach(key => {
        const outputNum = Number(key);
        const ioRef = circDef.outputRefs[outputNum];
        const sourceOnlineID = renumMap.get(ioRef.id);
        cpu.connectCircuitOutput(circOnlineID, outputNum, sourceOnlineID, ioRef.ioNum);
    });
    return circOnlineID;
}
export function createControllerBlueprint(cpu) {
    const datablocks = {};
    const taskCount = cpu.taskList.indexOf(0);
    const taskRefs = Array.from(cpu.taskList.slice(0, taskCount));
    const taskList = taskRefs.map(ref => cpu.getDatablockIDbyRef(ref));
    for (let id = 0; id < cpu.datablockTableLastUsedID; id++) {
        const blockRef = cpu.datablockTable[id];
        if (blockRef) {
            const blockHeader = cpu.getDatablockHeader(blockRef);
            let body;
            switch (blockHeader.type) {
                case 2 /* TASK */: {
                    body = createTaskDefinition(cpu, blockRef);
                    break;
                }
                case 3 /* CIRCUIT */: {
                    body = createCircuitDefinition(cpu, blockRef);
                    break;
                }
                case 4 /* FUNCTION */: {
                    body = createFunctionDefinition(cpu, blockRef);
                    break;
                }
            }
            datablocks[id] = {
                type: blockHeader.type,
                body
            };
        }
    }
    const blueprint = {
        version: SoftController.version,
        taskList,
        datablocks
    };
    console.log(blueprint);
    const refactored = refactorIDs(blueprint);
    console.log(refactored);
    return refactored;
}
function refactorIDs(plan) {
    const renumMap = new Map();
    const renum = (id) => renumMap.set(id, renumMap.size).size - 1;
    renum(0);
    function refactorCircuit(circID) {
        const circBlock = plan.datablocks[circID];
        if (circBlock.type != 3 /* CIRCUIT */) {
            console.error('Refactor: Invalid circuit data block type');
            return null;
        }
        const circ = circBlock.body;
        renum(circID);
        circ.callList.forEach(callID => {
            const funcBlock = plan.datablocks[callID];
            if (funcBlock.type == 4 /* FUNCTION */)
                renum(callID);
            else if (funcBlock.type == 3 /* CIRCUIT */)
                refactorCircuit(callID);
            else {
                console.error('Refactor: Invalid function call data block type');
                return null;
            }
        });
    }
    plan.taskList.forEach(taskID => {
        const taskBlock = plan.datablocks[taskID];
        if (taskBlock.type != 2 /* TASK */) {
            console.error('Refactor: Invalid task data block type');
            return;
        }
        const task = taskBlock.body;
        renum(taskID);
        const circID = task.targetID;
        refactorCircuit(circID);
    });
    const datablocks = {}; // Create a new data block table with refactored IDs
    console.log(renumMap);
    Object.keys(plan.datablocks).forEach(key => {
        const oldID = Number(key);
        console.log('Refactor: checking old id', oldID);
        if (oldID > 0 && renumMap.has(oldID)) { // If old ID is not found in renum map, then it's not called and is therefore discarded
            const block = plan.datablocks[oldID];
            const newID = renumMap.get(oldID);
            console.log(`Refactor: change ID ${oldID} -> ${newID}`);
            switch (block.type) {
                case 2 /* TASK */: {
                    datablocks[newID] = block;
                    const task = block.body;
                    task.targetID = renumMap.get(task.targetID);
                    break;
                }
                case 3 /* CIRCUIT */: {
                    const circ = block.body;
                    circ.callList = circ.callList.map(callID => renumMap.get(callID));
                    if (circ.outputRefs) {
                        Object.keys(circ.outputRefs).forEach(key => {
                            const ioRef = circ.outputRefs[key];
                            ioRef.id = renumMap.get(ioRef.id);
                        });
                    }
                }
                case 4 /* FUNCTION */: {
                    datablocks[newID] = block;
                    const func = block.body;
                    if (func.inputRefs) {
                        Object.keys(func.inputRefs).forEach(key => {
                            const ioRef = func.inputRefs[key];
                            ioRef.id = renumMap.get(ioRef.id);
                        });
                    }
                }
            }
        }
    });
    return {
        version: plan.version,
        taskList: plan.taskList.map(oldID => renumMap.get(oldID)),
        datablocks
    };
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
    const funcHeader = cpu.readFunctionHeader(ref);
    const inputRefs = Array.from(cpu.readFunctionInputRefs(ref)).map(ioRef => cpu.solveIOReference(ioRef));
    const modifiedInputRefs = {};
    inputRefs.forEach((ref, i) => {
        if (ref)
            modifiedInputRefs[i] = ref;
    });
    const outputRefs = Array.from(cpu.readCircuitOutputRefs(ref)).map(ioRef => cpu.solveIOReference(ioRef));
    const modifiedOutputRefs = {};
    outputRefs.forEach((ref, i) => {
        if (ref)
            modifiedOutputRefs[i] = ref;
    });
    const circuitDef = {
        library: 0,
        opcode: 0,
        inputCount: funcHeader.inputCount,
        outputCount: funcHeader.outputCount,
        staticCount: funcHeader.staticCount,
        ioFlags: Array.from(cpu.readFunctionIOFlags(ref)),
        ioValues: Array.from(cpu.readFunctionIOValues(ref)),
        callList: Array.from(cpu.readCircuitCallList(ref)).map(callRef => cpu.getDatablockIDbyRef(callRef)),
    };
    if (Object.keys(modifiedInputRefs).length > 0)
        circuitDef.inputRefs = modifiedInputRefs;
    if (Object.keys(modifiedOutputRefs).length > 0)
        circuitDef.outputRefs = modifiedOutputRefs;
    return circuitDef;
}
// FUNCTION
function createFunctionDefinition(cpu, ref) {
    const funcHeader = cpu.readFunctionHeader(ref);
    const ioFlags = Array.from(cpu.readFunctionIOFlags(ref));
    const ioValues = Array.from(cpu.readFunctionIOValues(ref));
    const inputRefs = Array.from(cpu.readFunctionInputRefs(ref)).map(ioRef => cpu.solveIOReference(ioRef));
    const modifiedFlags = {};
    const modifiedValues = {};
    const modifiedInputRefs = {};
    const func = getFunction(funcHeader.library, funcHeader.opcode);
    // Modified inputs
    for (let i = 0; i < funcHeader.inputCount; i++) {
        const k = Math.min(i, func.inputs.length - 1);
        if (ioFlags[i] != func.inputs[k].flags)
            modifiedFlags[i] = ioFlags[i];
        if (ioValues[i] != func.inputs[k].initValue)
            modifiedValues[i] = ioFlags[i];
    }
    // Modified outputs
    for (let i = funcHeader.inputCount; i < funcHeader.inputCount + funcHeader.outputCount; i++) {
        const k = Math.min(i - funcHeader.inputCount, func.outputs.length - 1);
        if (ioFlags[i] != func.outputs[k].flags)
            modifiedFlags[i] = ioFlags[i];
        if (ioValues[i] != func.outputs[k].initValue)
            modifiedValues[i] = ioFlags[i];
    }
    // Defined input references
    inputRefs.forEach((ref, i) => {
        if (ref)
            modifiedInputRefs[i] = ref;
    });
    const funcDef = {
        library: funcHeader.library,
        opcode: funcHeader.opcode
    };
    if (funcHeader.inputCount != func.inputs.length)
        funcDef.inputCount = funcHeader.inputCount;
    if (funcHeader.outputCount != func.outputs.length)
        funcDef.outputCount = funcHeader.outputCount;
    if (funcHeader.staticCount != func.staticCount)
        funcDef.staticCount = funcHeader.staticCount;
    if (Object.keys(modifiedFlags).length > 0)
        funcDef.ioFlags = modifiedFlags;
    if (Object.keys(modifiedValues).length > 0)
        funcDef.ioValues = modifiedValues;
    if (Object.keys(modifiedInputRefs).length > 0)
        funcDef.inputRefs = modifiedInputRefs;
    return funcDef;
}
