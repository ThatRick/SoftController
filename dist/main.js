import SoftController from './SoftController/SoftController.js';
import { getFunction, getFunctionName } from './SoftController/FunctionCollection.js';
import { getIOType } from './SoftController/SoftTypes.js';
import { createControllerBlueprint, loadControllerBlueprint } from './SoftController/SoftSerializer.js';
import CircuitView from './CircuitView/CircuitView.js';
import { vec2 } from './Lib/Vector2.js';
import { FunctionBlock } from './CircuitView/CircuitModel.js';
import FunctionBlockElem from './CircuitView/FunctionBlockElem.js';
function createTerminal(div) {
    return (text) => {
        const pre = document.createElement('pre');
        pre.textContent = text;
        div.appendChild(pre);
    };
}
function createControlButtonBar(buttons) {
    const nav = document.getElementById('navi');
    buttons.forEach(btn => {
        const elem = document.createElement('button');
        elem.textContent = btn.name;
        elem.onclick = ev => {
            ev.preventDefault();
            btn.fn();
        };
        nav.appendChild(elem);
    });
}
function setGridTemplateRows(gridContainer, gridRowHeights) {
    const template = Object.values(gridRowHeights).map(rowHeight => (rowHeight > 0) ? rowHeight + 'px' : 'auto').join(' ');
    gridContainer.style.gridTemplateRows = template;
}
const CSSGridRowHeights = {
    header: 32,
    gui: 480,
    splitBar: 10,
    terminal: 0
};
/////////////////////////
//  GUI Testing
function testGUI(cpu, funcs) {
    const viewSize = vec2(80, 40);
    const viewScale = vec2(14, 20);
    const guiContainer = document.getElementById('gui');
    const view = new CircuitView(guiContainer, viewSize, viewScale);
    const blocks = funcs.map(id => {
        const header = cpu.readFunctionHeaderByID(id);
        if (header)
            return new FunctionBlock(undefined, header.library, header.opcode, header.inputCount, header.outputCount);
    });
    const margin = vec2(6, 2);
    const area = vec2(16, 8);
    const w = (view.size.x - margin.x * 2);
    console.log('width', w);
    const blockElems = blocks.map((block, i) => {
        const n = i * area.x;
        const row = Math.trunc(n / w);
        const col = n - row * w;
        const y = margin.y + row * area.y;
        const x = margin.x + col;
        return new FunctionBlockElem(view.children, vec2(x, y), block);
    });
    return view;
}
//////////////////////////
//  PROGRAM ENTRY POINT
//
window.onload = () => {
    const terminal = createTerminal(document.getElementById('terminal'));
    const memSize = 64 * 1024; // bytes
    const cpu = new SoftController(memSize);
    window['cpu'] = cpu;
    const funcIDs = createTestBlocks(cpu, 10);
    const circId = funcIDs[0];
    const taskId = cpu.createTask(circId, 20, 5);
    const view = testGUI(cpu, funcIDs);
    const interval = 10; // ms
    let ticks = 10;
    const blueprint = createControllerBlueprint(cpu);
    // saveAsJSON(blueprint, 'cpu.json');
    terminal(systemSectorToString(cpu));
    terminal(breakLine);
    terminal('');
    terminal('      RUNNING TEST...');
    const loop = setInterval(() => {
        cpu.tick(interval);
        if (--ticks == 0)
            stop();
    }, interval);
    function stop() {
        clearTimeout(loop);
        terminal(taskToString(cpu, taskId));
        // print(systemSectorToString(cpu));
        // print(datablockTableToString(cpu));
        funcIDs.forEach(func => terminal(functionToString(cpu, func)));
    }
    createControlButtonBar([
        { name: 'Save', fn: () => saveAsJSON(blueprint, 'cpu.json') },
        { name: 'Load', fn: () => loadFromJSON(obj => {
                terminal(breakLine);
                terminal('');
                terminal('      LOADED A CONTROLLER FROM FILE:');
                console.log('Loaded controller blueprint:', obj);
                const cpu2 = loadControllerBlueprint(obj);
                terminal(systemSectorToString(cpu2));
                terminal(datablockTableToString(cpu2));
            }) },
        { name: 'Scale + ', fn: () => view.scale = vec2(1.25, 1.25) },
        { name: 'DUMMY', fn: () => { } },
    ]);
};
////////////////////
//  CREATE A TEST
//
function createTestBlocks(cpu, blockCount = 10) {
    // test
    const circId = cpu.createCircuit(4, 2, blockCount);
    const funcs = [circId];
    const maxOpcode = 7;
    const logicLib = 1;
    for (let i = 1; i < blockCount + 1; i++) {
        const opcode = i % maxOpcode;
        const funcType = getFunction(logicLib, opcode);
        const inputCount = funcType.variableInputCount ? 2 + Math.round(Math.random() * 4) : undefined;
        const funcId = cpu.createFunctionBlock(logicLib, opcode, circId, undefined, inputCount);
        funcs.push(funcId);
        const funcInfo = cpu.readFunctionHeaderByID(funcId);
        const sourceId = funcs[i - 1];
        const sourceInfo = cpu.readFunctionHeaderByID(sourceId);
        const inputNum = i % funcInfo.inputCount;
        const sourceIONum = sourceInfo.inputCount;
        const inverted = !(i % 2);
        cpu.connectFunctionInput(funcId, inputNum, sourceId, sourceIONum, inverted);
    }
    cpu.setFunctionIOValue(1, 0, 1);
    return funcs;
}
///////////////////////
//  JSON DATA
//
// Load from file
function loadFromJSON(fn) {
    const input = document.createElement('input');
    input.style.display = 'none';
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
        if (input.files.length > 0) {
            const file = input.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                if (typeof result == 'string') {
                    const obj = JSON.parse(result);
                    fn(obj);
                }
                else
                    console.error('File is not in valid format');
            };
            reader.readAsText(file);
        }
        else
            console.error('No file uploaded!');
        document.body.removeChild(input);
    };
    document.body.appendChild(input);
    input.click();
}
// Write to file
function saveAsJSON(obj, fileName) {
    const data = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.href = URL.createObjectURL(data);
    a.setAttribute('download', fileName);
    a.click();
    URL.revokeObjectURL(a.href);
    document.body.removeChild(a);
}
const breakLine = '='.repeat(80);
/////////////////////////////////////
//  Align value by desimal point
//
const defaultIntegerPadding = 9;
function alignValue(value, integerPartLen = defaultIntegerPadding, desimalPartLen = 7) {
    let [ints, decs] = value.toString().split('.');
    let str = ints.padStart(integerPartLen);
    if (decs) {
        if (decs.length > desimalPartLen) {
            let [, fixed] = value.toFixed(desimalPartLen).split('.');
            decs = fixed.slice(0, desimalPartLen - 1) + '~';
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
    if (type != 4 /* FUNCTION */ && type != 3 /* CIRCUIT */)
        return 'Invalid function ID: ' + funcID;
    let text = '';
    const addLine = (line) => text += (line + '\n');
    const funcRef = cpu.datablockTable[funcID];
    const funcHeader = cpu.readFunctionHeader(funcRef);
    const ioValues = cpu.readFunctionIOValues(funcRef);
    const ioFlags = cpu.readFunctionIOFlags(funcRef);
    const inputRefs = cpu.readFunctionInputRefs(funcRef);
    const func = (type == 4 /* FUNCTION */) ? getFunction(funcHeader.library, funcHeader.opcode) : null;
    const funcName = (func) ? getFunctionName(funcHeader.library, funcHeader.opcode) : 'CIRCUIT';
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
        const ioType = getIOType(flags);
        const value = (ioType == 2 /* BOOL */ || ioType == 1 /* INT */)
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
        const connector = (i < inputRefs.length && inputRefs[i] != 0) ? '―>' : '  ';
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
        const inputPin = hasInput ? (ioFlags[i] & 8 /* INVERTED */ ? 'o' : '-') : ' ';
        const outputPin = hasOutput ? '-' : ' ';
        const line = `${inputRef} ${connector} ${inputValue} ${inputPin}| ${inputName}${outputName} |${outputPin} ${outputValue}`;
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
    const circRef = cpu.datablockTable[circuitID];
    const callList = cpu.readCircuitCallList(circRef);
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
        'Data Memory (bytes)',
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
        targetRef: ['Target Ref', (value) => `${('0x' + value.toString(16).toUpperCase()).padStart(defaultIntegerPadding)}  (ID: ${cpu.getDatablockIDbyRef(value)})`],
        interval: ['Interval (ms)', (value) => alignValue(value)],
        offset: ['Offset (ms)', (value) => alignValue(value)],
        timeAccu: ['Time Accumulator (ms)', (value) => alignValue(value)],
        cpuTime: ['CPU Time desimal (ms)', (value) => alignValue(value)],
        cpuTimeInt: ['CPU Time Integer (ms)', (value) => alignValue(value)],
        runCount: ['Run Count', (value) => alignValue(value)],
    };
    const task = cpu.getTaskByID(taskID);
    console.log(task);
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
    addLine(`      ${'Average CPU Load (ms)'.padEnd(nameLength)}  ${alignValue(avgCPUtime)}`);
    return text;
}
