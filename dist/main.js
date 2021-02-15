// import { createControllerBlueprint, getBlueprintResourceNeeded, loadControllerBlueprint } from './SoftController/SoftSerializer.js'
import CircuitView from './CircuitView/CircuitView.js';
import { vec2 } from './Lib/Vector2.js';
import { Circuit } from './CircuitView/CircuitState.js';
import VirtualControllerLink from './VirtualController/VirtualControllerLink.js';
import { instructions } from './Controller/ControllerInterface.js';
import { defaultStyle } from './CircuitView/CircuitTypes.js';
import * as HTML from './lib/HTML.js';
import { ControllerTerminal } from './Terminal.js';
import { Menubar } from './Lib/HTMLMenubar.js';
import { CircuitMenuBar } from './CircuitView/CircuitMenuBar.js';
import { getFunctionBlock } from './State/FunctionLib.js';
function createControlButtonBar(buttons) {
    const nav = document.getElementById('mainMenubar');
    buttons.forEach(btn => nav.appendChild(btn.DOMElement));
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
const errorLogger = error => console.error(error);
//////////////////////////
//  PROGRAM ENTRY POINT
//
window.onload = () => app().catch(rejected => console.error(rejected));
function testzone(terminal) {
    const sel = getFunctionBlock({ typeName: 'Select' });
    sel.inputs[0].setValue(69);
    sel.inputs[1].setValue(420);
    sel.update(1);
    terminal.print(sel.toString());
    sel.inputs[2].setValue(1);
    sel.update(1);
    terminal.print(sel.toString());
}
async function app() {
    const mainMenubar = new Menubar(document.getElementById('mainMenubar'));
    const circuitMenubar = new CircuitMenuBar(document.getElementById('guiMenubar'));
    const terminalMenubar = new Menubar(document.getElementById('terminalMenubar'));
    // Create controller interface
    const cpu = new VirtualControllerLink();
    // Create a controller
    const memSize = 64 * 1024;
    await cpu.createController(memSize, 256, 16);
    const terminal = new ControllerTerminal(document.getElementById('terminal'), cpu);
    testzone(terminal);
    const circuitID = await createTestCircuit(cpu);
    const taskId = await cpu.createTask(circuitID, 100, 10);
    terminal.printSystemSector();
    terminal.printDatablockTable();
    const circuitSize = vec2(80, 40);
    const circuitScale = vec2(14, 20);
    const guiContainer = document.getElementById('gui');
    const view = new CircuitView(guiContainer, circuitSize, circuitScale, defaultStyle);
    const circuit = await Circuit.getOnlineCircuit(cpu, circuitID);
    view.loadCircuit(circuit);
    circuitMenubar.attachCircuit(view);
    mainMenubar.addItems([
        new HTML.Text('Controller'),
        new HTML.ActionButton('Run', async () => {
            await cpu.startController(100);
        }),
        new HTML.ActionButton('Stop', async () => {
            await cpu.stopController();
        }),
        new HTML.ActionButton('Step', async () => {
            await cpu.stepController(100);
        }),
    ]);
    terminalMenubar.addItems([
        new HTML.Text('Terminal'),
        new HTML.ActionButton('System', async () => terminal.printSystemSector()),
        new HTML.ActionButton('Table', async () => terminal.printDatablockTable()),
        new HTML.ActionButton('Circuit', async () => terminal.printFunctionBlock(circuit.onlineDB)),
        new HTML.ActionButton('Blocks', async () => circuit.blocks.forEach(async (block) => terminal.printFunctionBlock(block.onlineDB))),
        new HTML.ActionButton('Clear', () => terminal.clear()),
    ]);
}
////////////////////
//  CREATE A TEST
//
async function createTestCircuit(cpu) {
    // test
    const funcCount = instructions.libraries.reduce((sum, lib) => sum + lib.functions.length, 0);
    const blockCount = funcCount + 10;
    const circ = {
        inputs: [2 /* BINARY */, 1 /* INTEGER */, 0 /* FLOAT */],
        outputs: [2 /* BINARY */, 1 /* INTEGER */, 0 /* FLOAT */]
    };
    const circID = await cpu.createCircuit(circ.inputs.length, circ.outputs.length, blockCount);
    let i = 0;
    circ.inputs.forEach(input => cpu.setFunctionBlockIOFlags(circID, i++, input));
    circ.outputs.forEach(output => cpu.setFunctionBlockIOFlags(circID, i++, output));
    const funcs = [circID];
    for (const lib of instructions.libraries) {
        for (const [opcode, funcType] of lib.functions.entries()) {
            const inputCount = funcType.variableInputCount ? 2 + Math.round(Math.random() * 4) : undefined;
            const funcID = await cpu.createFunctionBlock(lib.id, opcode, circID, undefined, inputCount);
            funcs.push(funcID);
            const funcInfo = await cpu.getFunctionBlockHeader(funcID);
            const sourceID = funcs[funcs.length - 2];
            const sourceInfo = await cpu.getFunctionBlockHeader(sourceID);
            const inputNum = opcode % funcInfo.inputCount;
            const sourceIONum = (sourceID == circID) ? 1 : sourceInfo.inputCount;
            const inverted = !(opcode % 2) && (lib.id == 1);
            await cpu.connectFunctionBlockInput(funcID, inputNum, sourceID, sourceIONum, inverted);
        }
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
