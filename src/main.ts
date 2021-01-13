import VirtualController from './VirtualController/VirtualControllerCPU.js'
import { getFunction, getFunctionName } from './FunctionCollection.js'
import { DatablockType, IOFlag, IODataType, getIOType, IORef } from './Controller/ControllerDataTypes.js';
// import { createControllerBlueprint, getBlueprintResourceNeeded, loadControllerBlueprint } from './SoftController/SoftSerializer.js'
import CircuitView from './CircuitView/CircuitView.js'
import Vec2, {vec2} from './Lib/Vector2.js'
import { Circuit, FunctionBlock } from './CircuitView/CircuitModel.js';
import FunctionBlockElem from './CircuitView/FunctionBlockElem.js';
import VirtualControllerLink from './VirtualController/VirtualControllerLink.js';
import IControllerInterface from './Controller/ControllerInterface.js';

function createTerminal(div: HTMLElement) {
    return (text: string) => {
        const pre = document.createElement('pre');
        pre.textContent = text;
        div.appendChild(pre);
    }
}

function createControlButtonBar(buttons: {name: string, fn: () => void}[]) {
    const nav = document.getElementById('navi');
    buttons.forEach(btn => {
        const elem = document.createElement('button') as HTMLButtonElement;
        elem.textContent = btn.name;
        elem.onclick = ev => {
            ev.preventDefault()
            btn.fn()
        };
        nav.appendChild(elem)
    })
}

function setGridTemplateRows(gridContainer: HTMLElement, gridRowHeights: {[key: string]: number }) {
    const template = Object.values(gridRowHeights).map(rowHeight => (rowHeight > 0) ? rowHeight + 'px' : 'auto').join(' ')
    gridContainer.style.gridTemplateRows = template
}

const CSSGridRowHeights: { [key: string]: number }  =
{
    header:     32,
    gui:        480,
    splitBar:   10,
    terminal:   0
}

/////////////////////////
//  GUI Testing
async function testGUI(circuit: Circuit) {
    
    const guiContainer = document.getElementById('gui')

    const viewSize = vec2(80, 40)
    const viewScale = vec2(14, 20)

    const view = new CircuitView(guiContainer, viewSize, viewScale)
    view.loadCircuit(circuit)

    return view
}

const errorLogger = error => console.error(error)

//////////////////////////
//  PROGRAM ENTRY POINT
//
window.onload = () => app().catch(rejected => console.error(rejected))

async function app()
{
    const terminal = createTerminal(document.getElementById('terminal'));

    const memSize = 64 * 1024;  // bytes
    const cpu = new VirtualControllerLink()
    const result = await cpu.createController(memSize, 256, 16)

    // const blueprint = createControllerBlueprint(cpu);
    // saveAsJSON(blueprint, 'cpu.json');
    
    terminal(await systemSectorToString(cpu))
    terminal(breakLine);
    terminal('');
    terminal('      RUNNING TEST...')
    
    terminal(await datablockTableToString(cpu));

    const circuitID = await createTestCircuit(cpu, 10)
    const taskId = await cpu.createTask(circuitID, 20)
    
    const interval = 10 // ms
    const ticks = 10

    const circuit = await Circuit.downloadOnline(cpu, circuitID)
    
    await cpu.stepController(interval, ticks).catch(errorLogger).then(async result => {
        terminal(await taskToString(cpu, taskId))
        terminal(await systemSectorToString(cpu));
        // print(datablockTableToString(cpu));
        circuit.blocks.forEach(async block => terminal(await functionToString(cpu, block.id)));
    })

    const view = await testGUI(circuit)

    createControlButtonBar([
        // { name: 'Save', fn: () => saveAsJSON(blueprint, 'cpu.json') },
        // { name: 'Load', fn: () => loadFromJSON(obj => {
        //     terminal(breakLine);
        //     terminal('');
        //     terminal('      LOADED A CONTROLLER FROM FILE:');
        //     console.log('Loaded controller blueprint:', obj)

        //     const needed = getBlueprintResourceNeeded(obj)
        //     const dataMemSize = needed.dataMemSize + 4096
        //     const datablockTableLength = needed.datablockTableLength + 256
        //     const taskListLength = needed.taskListLength + 16
            
        //     console.log(`Loading controller (needed mem: ${dataMemSize} bytes, table size: ${datablockTableLength}, task list size: ${taskListLength})`)
        //     const cpuLink = new SoftControllerLink(new SoftController(dataMemSize, datablockTableLength, taskListLength))
        //     loadControllerBlueprint(obj);
        //     terminal(systemSectorToString(cpuLink));
        //     terminal(datablockTableToString(cpuLink));
        // })},
        { name: 'Scale + ', fn: () => view.scale = vec2(1.25, 1.25) },
        { name: 'DUMMY', fn: () => {} },
    ])

    return true
}

////////////////////
//  CREATE A TEST
//
async function createTestCircuit(cpu: IControllerInterface, blockCount = 10) {
    // test
    const circID = await cpu.createCircuit(4, 2, blockCount)
    if (!circID) { console.error('Create test circuit: Creation failed miserable'); return }
    const funcs: number[] = [circID]
    const maxOpcode = 7
    const logicLib = 1;
    for (let i = 1; i < blockCount+1; i++) {
        const opcode = i % maxOpcode
        const funcType = getFunction(logicLib, opcode)
        const inputCount = funcType.variableInputCount ? 2 + Math.round(Math.random() * 4): undefined
        const funcId = await cpu.createFunctionBlock(logicLib, opcode, circID, undefined, inputCount);
        funcs.push(funcId);
        const funcInfo = await cpu.getFunctionBlockHeader(funcId);
        const sourceId = funcs[i-1];
        const sourceInfo = await cpu.getFunctionBlockHeader(sourceId);
        const inputNum = i % funcInfo.inputCount;
        const sourceIONum = sourceInfo.inputCount;
        const inverted = !(i % 2);
        await cpu.connectFunctionBlockInput(funcId, inputNum, sourceId, sourceIONum, inverted);
    }
    await cpu.setFunctionBlockIOValue(1, 0, 1);
    return circID
}

///////////////////////
//  JSON DATA
//

// Load from file
function loadFromJSON(fn: (obj: Object) => void) {
    const input = document.createElement('input') as HTMLInputElement;
    input.style.display = 'none';
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
        if (input.files.length > 0) {
            const file = input.files[0];
            const reader = new FileReader()
            reader.onload = () => {
                const result = reader.result;
                if (typeof result == 'string') {
                    const obj = JSON.parse(result);
                    fn(obj);
                }
                else console.error('File is not in valid format')
            }
            reader.readAsText(file);
        }
        else console.error('No file uploaded!');
        document.body.removeChild(input);
    }
    document.body.appendChild(input);
    input.click();
}

// Write to file
function saveAsJSON(obj, fileName) {
    const data = new Blob([JSON.stringify(obj, null, 2)], {type: 'application/json'});

    const a = document.createElement('a');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.href = URL.createObjectURL(data);
    a.setAttribute('download', fileName);
    a.click();
    URL.revokeObjectURL(a.href);
    document.body.removeChild(a);
}



const breakLine = '='.repeat(80)

/////////////////////////////////////
//  Align value by desimal point
//
const defaultIntegerPadding = 9
function alignValue(value: number, integerPartLen = defaultIntegerPadding, desimalPartLen = 7) {
    let [ints, decs] = value.toString().split('.');
    let str = ints.padStart(integerPartLen);
    if (decs) {
        if (decs.length > desimalPartLen) {
            let [, fixed] = value.toFixed(desimalPartLen).split('.');
            decs = fixed.slice(0, desimalPartLen-1) + '~';
        }
        str += '.' + decs;
    }
    return str;
}

/////////////////////////////////////
//  Print function block to string
//
async function functionToString(cpu: IControllerInterface, funcID: number) {
    const type = (await cpu.getDatablockHeader(funcID)).type;
    if (type != DatablockType.FUNCTION && type != DatablockType.CIRCUIT) return 'Invalid function ID: ' + funcID

    let text = ''
    const addLine = (line: string) => text += (line + '\n');

    const funcBlock = await cpu.getFunctionBlockData(funcID)
    
    const func = (type == DatablockType.FUNCTION) ? getFunction(funcBlock.library, funcBlock.opcode) : null;
    const funcName = (func) ? getFunctionName(funcBlock.library, funcBlock.opcode) : 'CIRCUIT';

    const inputRefLen = 6;
    const valueLen = 8;
    const precision = 6;
    const inputNameLen = 9;
    const outputNameLen = 6;
    const rows = Math.max(funcBlock.inputCount, funcBlock.outputCount);

    function printRef(ioRef: IORef): string {
        return (ioRef) ? ioRef.id+':'+ioRef.ioNum : ''
    }

    function ioValue(i: number): string {
        const flags = funcBlock.ioFlags[i];
        const ioType = getIOType(flags)
        const value = (ioType == IODataType.BINARY || ioType == IODataType.INTEGER)
                    ? funcBlock.ioValues[i].toFixed(0)
                    : funcBlock.ioValues[i].toPrecision(precision);
        
        return (i < funcBlock.inputCount) ? value.padStart(valueLen) : value.padEnd(valueLen);
    }

    addLine(breakLine);
    addLine(`${funcID.toString().padStart(3, '0')}:  ${funcName}`)
    addLine('');
    addLine(`${' '.repeat(inputRefLen)}    ${' '.repeat(valueLen)}   _${'_'.repeat(inputNameLen)}${'_'.repeat(outputNameLen)}_`);

    for (let i = 0; i < rows; i++) {
        let hasInput, hasOutput: boolean;
        const connector = (i < funcBlock.inputRefs.length && funcBlock.inputRefs[i]) ? '―>' : '  '
        const inputRef = (i < funcBlock.inputRefs.length && funcBlock.inputRefs[i]) ? printRef(funcBlock.inputRefs[i]).padStart(inputRefLen) : ' '.repeat(inputRefLen);
        const inputValue = (i < funcBlock.inputCount && (hasInput=true)) ? ioValue(i) : ' '.repeat(valueLen);
        const inputName = (i < funcBlock.inputCount) ? (func ? ((i < func.inputs.length && func.inputs[i].name) ? func.inputs[i].name.padEnd(inputNameLen)
                                                                                                                 : ((i == 0) ? funcName.padEnd(inputNameLen)
                                                                                                                             : ' '.repeat(inputNameLen)))
                                                              : i.toString().padEnd(inputNameLen))
                                                      : ' '.repeat(inputNameLen);

        const outNum = i + funcBlock.inputCount;
        const outputName = (i < funcBlock.outputCount) ? (func ? ((i < func.outputs.length && func.outputs[i].name) ? func.outputs[i].name.padStart(outputNameLen)
                                                                                                                     : ' '.repeat(outputNameLen))
                                                                : i.toString().padStart(outputNameLen))
                                                        : ' '.repeat(outputNameLen);

        const outputValue = (i < funcBlock.outputCount && (hasOutput=true)) ? ioValue(outNum) : ' '.repeat(valueLen);

        const inputPin = hasInput ? (funcBlock.ioFlags[i] & IOFlag.INVERTED ? 'o' : '-') : ' ' 
        const outputPin = hasOutput ? '-' : ' '
        const line = `${inputRef} ${connector} ${inputValue} ${inputPin}| ${inputName}${outputName} |${outputPin} ${outputValue}`
        addLine(line);
    }
    addLine(`${' '.repeat(inputRefLen)}    ${' '.repeat(valueLen)}   ‾${'‾'.repeat(inputNameLen)}${'‾'.repeat(outputNameLen)}‾`);

    if (!func) text += '\n' + circuitToString(cpu, funcID);

    return text;
}

//////////////////////////////
//  Print circuit to string
//
async function circuitToString(cpu: IControllerInterface, circuitID: number) {
    let text = ''
    const addLine = (line: string) => text += (line + '\n');
    const circuit = await cpu.getCircuitData(circuitID);
    if (!circuit) return 'Error'
    addLine(`CALL LIST (size: ${circuit.callIDList.length})`)
    addLine('')
    circuit.callIDList.forEach((funcID, i) => {
        addLine(`${i.toString().padStart(3)}:  ${funcID.toString().padStart(3, '0')}`)
    })

    return text;
}

///////////////////////////////////////////
//  Print data block table info to string
//
async function datablockTableToString(cpu: IControllerInterface) {
    const typeNames = ['UNDEFINED', 'UNALLOCATED', 'TASK', 'CIRCUIT', 'FUNCTION', 'DATA']
    const maxTypeNameLength = (typeNames.reduce((a, b) => (a.length > b.length) ? a : b)).length;

    let text = '';
    const addLine = (line: string) => text += (line + '\n');
    
    const datablockTable = await cpu.getDatablockList().catch(error => [])

    addLine(breakLine)
    addLine(`DATA BLOCK TABLE (size: ${datablockTable.length})`)
    addLine('')


    datablockTable.forEach(async (offset, id) => {
        if (offset) {
            const header = await cpu.getDatablockHeader(id);
            const startAddr = offset.toString(16).toUpperCase()
            const endAddr = (offset + header.byteLength - 1).toString(16).toUpperCase()
            addLine(`${id.toString().padStart(3, '0')}:  ${typeNames[header.type].padEnd(maxTypeNameLength)}  \
${header.byteLength.toString().padStart(6)} bytes  [${startAddr} - ${endAddr}]  ${(header.parentID) ? 'parent: '+header.parentID : ''}`);
        }
    })
    return text;
}

//////////////////////////////////////////////
//  Print system sector parameters to string
//
async function systemSectorToString(cpu: IControllerInterface): Promise<string> {
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
    ]
    const maxParamNameLength = (systemParameterNames.reduce((a, b) => (a.length > b.length) ? a : b)).length;
    let text = ''
    const addLine = (line: string) => text += (line + '\n');
    
    addLine(breakLine);
    addLine(`SYSTEM SECTOR`)
    addLine('')
    
    const systemSector = await cpu.getSystemSector()
    
    Object.keys(systemSector).forEach((key, i) => {
        addLine(`${i.toString().padStart(3)}:  ${systemParameterNames[i].padEnd(maxParamNameLength)}  ${systemSector[key].toString().padStart(6)}`);
    });
    
    addLine('');
    
    return text
}

///////////////////////////
//  Print task to string
//
async function taskToString(cpu: IControllerInterface, taskID: number) {
    const nameLength = 22
    const names: {[index: string]: [string, (value: number) => string]} =
    {
        targetRef:   ['Target Ref',             (value) => `${('0x'+value.toString(16).toUpperCase()).padStart(defaultIntegerPadding)}  (ID: ${cpu.getDatablockID(value)})`],
        interval:    ['Interval (ms)',          (value) => alignValue(value)],
        offset:      ['Offset (ms)',            (value) => alignValue(value)],
        timeAccu:    ['Time Accumulator (ms)',  (value) => alignValue(value)],
        cpuTime:     ['CPU Time desimal (ms)',  (value) => alignValue(value)],
        cpuTimeInt:  ['CPU Time Integer (ms)',  (value) => alignValue(value)],
        runCount:    ['Run Count',              (value) => alignValue(value)],
    }
    
    const task = await cpu.getTask(taskID);
    let text = ''
    const addLine = (line: string) => text += (line + '\n');
    
    addLine(breakLine);
    addLine(`${taskID.toString().padStart(3, '0')}:  TASK DATA`)
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
    return text
}
