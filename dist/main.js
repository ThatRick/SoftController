import SoftController from './SoftController.js';
import { DatablockType } from './SoftTypes.js';
function makeLogger(div) {
    return function logLine(text) {
        const pre = document.createElement('pre');
        pre.textContent = text;
        div.appendChild(pre);
    };
}
//////////////////////////
//  PROGRAM ENTRY POINT
//
window.onload = () => {
    const print = makeLogger(document.getElementById('main'));
    const memSize = 16 * 1024;
    const cpu = new SoftController(memSize);
    window['cpu'] = cpu;
    print(systemSectorToString(cpu));
    const funcs = createTestBlocks(cpu, 100);
    const circId = funcs[0];
    const taskId = cpu.createTask(circId, 20, 5);
    print(taskToString(cpu, taskId));
    const interval = 10; // ms
    let ticks = 100;
    print('*** RUNNING TEST... ***');
    const loop = setInterval(() => {
        cpu.tick(interval);
        if (ticks-- == 0)
            stop();
    }, interval);
    function stop() {
        clearTimeout(loop);
        const task = cpu.getTaskByID(taskId);
        print(taskToString(cpu, taskId));
        print(systemSectorToString(cpu));
        print(datablockTableToString(cpu));
        funcs.forEach(func => print(functionToString(cpu, func)));
    }
};
////////////////////
//  CREATE A TEST
//
function createTestBlocks(cpu, blockCount = 10) {
    // test
    const circId = cpu.createCircuit(4, 2, 256);
    const funcs = [circId];
    const maxOpcode = 7;
    const logicLib = 0;
    for (let i = 1; i < blockCount + 1; i++) {
        const opcode = i % maxOpcode;
        const funcId = cpu.createFunctionBlock(logicLib, opcode, circId);
        funcs.push(funcId);
        const funcInfo = cpu.getFunctionHeaderByID(funcId);
        const sourceId = funcs[i - 1];
        const sourceInfo = cpu.getFunctionHeaderByID(sourceId);
        const inputNum = i % funcInfo.inputCount;
        const sourceIONum = sourceInfo.inputCount;
        cpu.connectFunctionInput(funcId, inputNum, sourceId, sourceIONum);
    }
    cpu.setFunctionIOValue(2, 0, 1);
    return funcs;
}
const breakLine = '='.repeat(80);
/////////////////////////////////////
//  Align value by desimal point
//
function alignValue(value, integerPart = 9, desimalPart = 7) {
    let [ints, decs] = value.toString().split('.');
    let str = ints.padStart(integerPart);
    if (decs) {
        if (decs.length > desimalPart) {
            let [, fixed] = value.toFixed(desimalPart).split('.');
            decs = fixed.slice(0, desimalPart - 1) + '~';
        }
        str += '.' + decs;
    }
    return str;
}
/////////////////////////////////////
//  Print function block to string
//
function functionToString(cpu, funcID) {
    const type = cpu.getDatablockHeaderByID(funcID).type;
    if (type != DatablockType.FUNCTION && type != DatablockType.CIRCUIT)
        return 'Invalid function ID: ' + funcID;
    let text = '';
    const addLine = (line) => text += (line + '\n');
    const funcHeader = cpu.getFunctionHeaderByID(funcID);
    const ioValues = cpu.getFunctionIOValues(funcID);
    const ioFlags = cpu.getFunctionIOFlags(funcID);
    const inputRefs = cpu.getFunctionInputRefs(funcID);
    const func = (type == DatablockType.FUNCTION) ? cpu.functionLibraries[funcHeader.library].getFunction(funcHeader.opcode) : null;
    const funcName = (func) ? cpu.functionLibraries[funcHeader.library].getFunctionName(funcHeader.opcode) : 'CIRCUIT';
    const inputRefLen = 6;
    const valueLen = 8;
    const precision = 6;
    const inputNameLen = 9;
    const outputNameLen = 6;
    const rows = Math.max(funcHeader.inputCount, funcHeader.outputCount);
    function solveRef(ref) {
        const solved = cpu.solveIOReference(ref);
        return (solved) ? solved.id + ':' + solved.ioNum : ref.toString(16);
    }
    function ioValue(i) {
        const flags = ioFlags[i];
        const value = (flags & (2 /* BOOLEAN */ | 4 /* INTEGER */))
            ? ioValues[i].toFixed(0)
            : ioValues[i].toPrecision(precision);
        return (i < funcHeader.inputCount) ? value.padStart(valueLen) : value.padEnd(valueLen);
    }
    addLine(breakLine);
    addLine(`${funcID.toString().padStart(3, '0')}:  ${funcName}`);
    addLine('');
    addLine(`${' '.repeat(inputRefLen)}    ${' '.repeat(valueLen)}   _${'_'.repeat(inputNameLen)}${'_'.repeat(outputNameLen)}_`);
    for (let i = 0; i < rows; i++) {
        let hasInput, hasOutput;
        const connector = (i < inputRefs.length && inputRefs[i] != 0) ? ((ioFlags[i] & 8 /* INVERTED */) ? '―o' : '―>') : '  ';
        const inputRef = (i < inputRefs.length && inputRefs[i] != 0) ? solveRef(inputRefs[i]).padStart(inputRefLen) : ' '.repeat(inputRefLen);
        const inputValue = (i < funcHeader.inputCount && (hasInput = true)) ? ioValue(i) : ' '.repeat(valueLen);
        const inputName = (i < funcHeader.inputCount) ? (func ? ((i < func.inputs.length && func.inputs[i].name) ? func.inputs[i].name.padEnd(inputNameLen)
            : ((i == 0) ? funcName.padEnd(inputNameLen)
                : ' '.repeat(inputNameLen)))
            : i.toString().padEnd(inputNameLen))
            : ' '.repeat(inputNameLen);
        const outNum = i + funcHeader.inputCount;
        const outputName = (i < funcHeader.outputCount) ? (func ? ((i < func.outputs.length && func.outputs[i].name) ? func.outputs[i].name.padStart(outputNameLen)
            : ' '.repeat(outputNameLen))
            : i.toString().padStart(outputNameLen))
            : ' '.repeat(outputNameLen);
        const outputValue = (i < funcHeader.outputCount && (hasOutput = true)) ? ioValue(outNum) : ' '.repeat(valueLen);
        const line = `${inputRef} ${connector} ${inputValue} ${hasInput ? '–' : ' '}| ${inputName}${outputName} |${hasOutput ? '–' : ' '} ${outputValue}`;
        addLine(line);
    }
    addLine(`${' '.repeat(inputRefLen)}    ${' '.repeat(valueLen)}   ‾${'‾'.repeat(inputNameLen)}${'‾'.repeat(outputNameLen)}‾`);
    if (!func)
        text += '\n' + circuitToString(cpu, funcID);
    return text;
}
//////////////////////////////
//  Print circuit to string
//
function circuitToString(cpu, circuitID) {
    let text = '';
    const addLine = (line) => text += (line + '\n');
    const callList = cpu.getCircuitCallList(circuitID);
    addLine(`CALL LIST (size: ${callList.length})`);
    addLine('');
    for (let i = 0; i < callList.length; i++) {
        const callRef = callList[i];
        if (callRef == 0)
            break;
        const funcID = cpu.getDatablockIDbyRef(callRef);
        addLine(`${i.toString().padStart(3)}:  ${funcID.toString().padStart(3, '0')}  [${callRef.toString(16).toUpperCase()}]`);
    }
    return text;
}
///////////////////////////////////////////
//  Print data block table info to string
//
function datablockTableToString(cpu) {
    const typeNames = ['UNDEFINED', 'UNALLOCATED', 'TASK', 'CIRCUIT', 'FUNCTION', 'DATA'];
    const maxTypeNameLength = (typeNames.reduce((a, b) => (a.length > b.length) ? a : b)).length;
    let text = '';
    const addLine = (line) => text += (line + '\n');
    addLine(breakLine);
    addLine(`DATA BLOCK TABLE (size: ${cpu.datablockTable.length})`);
    addLine('');
    cpu.datablockTable.forEach((offset, id) => {
        if (offset) {
            const header = cpu.getDatablockHeaderByID(id);
            const startAddr = offset.toString(16).toUpperCase();
            const endAddr = (offset + header.byteLength - 1).toString(16).toUpperCase();
            addLine(`${id.toString().padStart(3, '0')}:  ${typeNames[header.type].padEnd(maxTypeNameLength)}  \
${header.byteLength.toString().padStart(6)} bytes  [${startAddr} - ${endAddr}]  ${(header.parentID) ? 'parent: ' + header.parentID : ''}`);
        }
    });
    return text;
}
//////////////////////////////////////////////
//  Print system sector parameters to string
//
function systemSectorToString(cpu) {
    const systemParameterNames = [
        'ID',
        'Version',
        'Total Memory (bytes)',
        'Data Block Table Ref',
        'Data Block Table Length',
        'Data Block Table Last Used ID',
        'Data Block Table Version',
        'Task List Ref',
        'Task List Length'
    ];
    const maxParamNameLength = (systemParameterNames.reduce((a, b) => (a.length > b.length) ? a : b)).length;
    let text = '';
    const addLine = (line) => text += (line + '\n');
    addLine(breakLine);
    addLine(`SYSTEM SECTOR`);
    addLine('');
    for (let i = 0; i < cpu.systemSector.length; i++) {
        addLine(`${i.toString().padStart(3)}:  ${systemParameterNames[i].padEnd(maxParamNameLength)}  ${cpu.systemSector[i].toString().padStart(6)}`);
    }
    addLine('');
    return text;
}
///////////////////////////
//  Print task to string
//
function taskToString(cpu, taskID) {
    const nameLength = 22;
    const names = {
        targetRef: ['Target Ref', (value) => alignValue(cpu.getDatablockIDbyRef(value)) + `  [${value.toString(16).toUpperCase()}]`],
        interval: ['Interval (ms)', (value) => alignValue(value)],
        offset: ['Offset (ms)', (value) => alignValue(value)],
        timeAccu: ['Time Accumulator (ms)', (value) => alignValue(value)],
        cpuTime: ['CPU Time (ms)', (value) => alignValue(value)],
        cpuTimeInt: ['CPU Time Integer (ms)', (value) => alignValue(value)],
        runCount: ['Run Count', (value) => alignValue(value)],
    };
    const task = cpu.getTaskByID(taskID);
    let text = '';
    const addLine = (line) => text += (line + '\n');
    addLine(breakLine);
    addLine(`${taskID.toString().padStart(3, '0')}:  TASK DATA`);
    addLine('');
    for (const [key, value] of Object.entries(task)) {
        const [name, func] = names[key];
        addLine(`      ${name.padEnd(nameLength)}  ${func(value)}`);
    }
    const totalCPUtime = task.cpuTimeInt + task.cpuTime;
    const avgCPUtime = totalCPUtime / task.runCount;
    addLine('');
    addLine('Calculated:');
    addLine('');
    addLine(`      ${'Total CPU Time (ms)'.padEnd(nameLength)}  ${alignValue(totalCPUtime)}`);
    addLine(`      ${'Average CPU Time (ms)'.padEnd(nameLength)}  ${alignValue(avgCPUtime)}`);
    return text;
}
