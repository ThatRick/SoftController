import { IODataType } from './Controller/ControllerDataTypes.js';
// import { createControllerBlueprint, getBlueprintResourceNeeded, loadControllerBlueprint } from './SoftController/SoftSerializer.js'
import CircuitView from './CircuitView/CircuitView.js'
import Vec2, {vec2} from './Lib/Vector2.js'
import { Circuit } from './CircuitView/CircuitState.js';
import VirtualControllerLink from './VirtualController/VirtualControllerLink.js';
import { IControllerInterface, instructions } from './Controller/ControllerInterface.js';
import { defaultStyle } from './CircuitView/CircuitTypes.js';
import * as HTML from './lib/HTML.js'
import { ControllerTerminal } from './Terminal.js';
import { GUIMenubar } from './GUI/GUIMenubar.js'
import { CircuitMenuBar } from './CircuitView/CircuitMenuBar.js';


function createControlButtonBar(buttons: HTML.ButtonBase[]) {
    const nav = document.getElementById('mainMenubar')
    buttons.forEach(btn => nav.appendChild(btn.DOMElement))
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

const errorLogger = error => console.error(error)

//////////////////////////
//  PROGRAM ENTRY POINT
//
window.onload = () => app().catch(rejected => console.error(rejected))

async function app()
{
    const mainMenubar = new GUIMenubar(document.getElementById('mainMenubar'))
    const circuitMenubar = new CircuitMenuBar(document.getElementById('guiMenubar'))
    const terminalMenubar = new GUIMenubar(document.getElementById('terminalMenubar'))

    // Create controller interface
    const cpu = new VirtualControllerLink()
    
    // Create a controller
    const memSize = 64 * 1024
    await cpu.createController(memSize, 256, 16)
    
    const terminal = new ControllerTerminal(document.getElementById('terminal'), cpu);
    
    const circuitID = await createTestCircuit(cpu)
    const taskId = await cpu.createTask(circuitID, 100, 10)
    
    terminal.printSystemSector()
    terminal.printDatablockTable()

    const circuitSize = vec2(80, 40)
    const circuitScale = vec2(14, 20)
    
    const guiContainer = document.getElementById('gui')
    const view = new CircuitView(guiContainer, circuitSize, circuitScale, defaultStyle)
    
    const circuit = await Circuit.getOnlineCircuit(cpu, circuitID)
    view.loadCircuit(circuit)

    circuitMenubar.attachCircuit(circuit)

    mainMenubar.addItems([
        new HTML.Text('Controller'),
        new HTML.Button('Run', async () => {
            await cpu.startController(100)
        }),
        new HTML.Button('Stop', async () => {
            await cpu.stopController()
        }),
        new HTML.Button('Step', async () => {
            await cpu.stepController(100)
        }),
    ])

    terminalMenubar.addItems([
        new HTML.Text('Terminal'),
        new HTML.Button('System', async () => terminal.printSystemSector()),
        new HTML.Button('Table', async () => terminal.printDatablockTable()),
        new HTML.Button('Circuit', async () => terminal.printFunctionBlock(circuit.onlineID)),
        new HTML.Button('Blocks', async () => circuit.blocks.forEach(async block => terminal.printFunctionBlock(block.onlineID))),
        new HTML.Button('Clear', () => terminal.clear()),
    ])
}

////////////////////
//  CREATE A TEST
//
async function createTestCircuit(cpu: IControllerInterface) {
    // test
    const funcCount = Array.from(instructions.libraries.values()).reduce((sum, lib) => sum + lib.functions.length, 0)
    const blockCount = funcCount + 10
    const circ = {
        inputs: [IODataType.BINARY, IODataType.INTEGER, IODataType.FLOAT],
        outputs: [IODataType.BINARY, IODataType.INTEGER, IODataType.FLOAT]
    }
    const circID = await cpu.createCircuit(circ.inputs.length, circ.outputs.length, blockCount)
    let i = 0
    circ.inputs.forEach(input => cpu.setFunctionBlockIOFlags(circID, i++, input))
    circ.outputs.forEach(output => cpu.setFunctionBlockIOFlags(circID, i++, output))
    
    const funcs: number[] = [circID]
    
    for (const [libID, lib] of instructions.libraries.entries()) {
        for (const [opcode, funcType] of lib.functions.entries()) {
            console.log('Instruction:', libID, opcode, funcType)
            const inputCount = funcType.variableInputCount ? 2 + Math.round(Math.random() * 4): undefined
            const funcID = await cpu.createFunctionBlock(libID, opcode, circID, undefined, inputCount);
            funcs.push(funcID);
            const funcInfo = await cpu.getFunctionBlockHeader(funcID);
            const sourceID = funcs[funcs.length - 2];
            const sourceInfo = await cpu.getFunctionBlockHeader(sourceID);
            const inputNum = opcode % funcInfo.inputCount;
            const sourceIONum = (sourceID==circID) ? 1 : sourceInfo.inputCount;
            const inverted = !(opcode % 2) && (libID == 1);
            await cpu.connectFunctionBlockInput(funcID, inputNum, sourceID, sourceIONum, inverted);
            console.log('connect', funcID, inputNum, sourceID, sourceIONum)

        }
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
