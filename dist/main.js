import { getFunction } from './FunctionCollection.js';
// import { createControllerBlueprint, getBlueprintResourceNeeded, loadControllerBlueprint } from './SoftController/SoftSerializer.js'
import CircuitView from './CircuitView/CircuitView.js';
import { vec2 } from './Lib/Vector2.js';
import { Circuit } from './CircuitView/CircuitState.js';
import VirtualControllerLink from './VirtualController/VirtualControllerLink.js';
import { defaultStyle } from './CircuitView/CircuitTypes.js';
import * as HTML from './lib/HTML.js';
import { ControllerTerminal } from './Terminal.js';
function createControlButtonBar(buttons) {
    const nav = document.getElementById('navi');
    buttons.forEach(btn => nav.appendChild(btn.elem));
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
function testGUI(circuit) {
    const guiContainer = document.getElementById('gui');
    const viewSize = vec2(80, 40);
    const viewScale = vec2(14, 20);
    const view = new CircuitView(guiContainer, viewSize, viewScale, defaultStyle);
    view.loadCircuit(circuit);
    return view;
}
const errorLogger = error => console.error(error);
//////////////////////////
//  PROGRAM ENTRY POINT
//
window.onload = () => app().catch(rejected => console.error(rejected));
async function app() {
    const memSize = 64 * 1024; // bytes
    const cpu = new VirtualControllerLink();
    const result = await cpu.createController(memSize, 256, 16);
    const terminal = new ControllerTerminal(document.getElementById('terminal'), cpu);
    // const blueprint = createControllerBlueprint(cpu);
    // saveAsJSON(blueprint, 'cpu.json');
    const circuitID = await createTestCircuit(cpu, 10);
    const taskId = await cpu.createTask(circuitID, 100, 10);
    terminal.printSystemSector();
    terminal.printDatablockTable();
    const circuit = await Circuit.loadFromOnlineCPU(cpu, circuitID);
    const view = testGUI(circuit);
    createControlButtonBar([
        new HTML.Button(null, 'Run', async () => {
            await cpu.startController(20);
        }),
        new HTML.Button(null, 'Stop', async () => {
            await cpu.stopController();
        }),
        new HTML.Button(null, 'Step', async () => {
            await cpu.stepController(20);
        }),
        new HTML.Button(null, 'Upload', async () => {
            console.log('Upload changes');
            await circuit.sendChanges();
            console.log('Step controller');
        }),
        new HTML.Button(null, 'debug', async () => {
            terminal.printSystemSector();
            terminal.printDatablockTable();
            terminal.printTask(taskId);
            terminal.printFunctionBlock(circuit.onlineID);
            circuit.blocks.forEach(async (block) => terminal.printFunctionBlock(block.onlineID));
        }),
        new HTML.Button(null, 'Clear', () => terminal.clear()),
        new HTML.ToggleButton(null, 'Immediate', state => circuit.setImmediateMode(state), circuit.immediateMode)
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
    ]);
}
////////////////////
//  CREATE A TEST
//
async function createTestCircuit(cpu, blockCount = 10) {
    // test
    const circID = await cpu.createCircuit(4, 2, blockCount);
    for (let i = 0; i < 4 + 2; i++)
        cpu.setFunctionBlockIOFlags(circID, i, 2 /* BINARY */);
    if (!circID) {
        console.error('Create test circuit: Creation failed miserable');
        return;
    }
    const funcs = [circID];
    const maxOpcode = 7;
    const logicLib = 1;
    for (let i = 1; i < blockCount + 1; i++) {
        const opcode = i % maxOpcode;
        const funcType = getFunction(logicLib, opcode);
        const inputCount = funcType.variableInputCount ? 2 + Math.round(Math.random() * 4) : undefined;
        const funcId = await cpu.createFunctionBlock(logicLib, opcode, circID, undefined, inputCount);
        funcs.push(funcId);
        const funcInfo = await cpu.getFunctionBlockHeader(funcId);
        const sourceId = funcs[i - 1];
        const sourceInfo = await cpu.getFunctionBlockHeader(sourceId);
        const inputNum = i % funcInfo.inputCount;
        const sourceIONum = (i == 1) ? 1 : sourceInfo.inputCount;
        const inverted = !(i % 2);
        await cpu.connectFunctionBlockInput(funcId, inputNum, sourceId, sourceIONum, inverted);
    }
    await cpu.setFunctionBlockIOValue(1, 0, 1);
    return circID;
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
