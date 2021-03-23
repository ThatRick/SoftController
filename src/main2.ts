import * as HTML from './Lib/HTML.js'
import { ControllerTerminal } from './Terminal.js';
import { BlockEventType } from './State/FunctionBlock.js'

import { getFunctionBlock } from './State/FunctionLib.js'
import CircuitView, { CircuitViewDefinition } from './View/CircuitView.js'
import Vec2, { vec2 } from './Lib/Vector2.js';
import { IODataType } from './State/CommonTypes.js';
import { CircuitMenuBar } from './View/CircuitMenubar.js';

//////////////////////////
//  PROGRAM ENTRY POINT
//
window.onload = () => app().catch(rejected => console.error(rejected))

const myProg: CircuitViewDefinition =
{
    definition: {
        name: 'Test circuit 1',
        inputs: {
            meas: { value: 123, dataType: 'FLOAT' },
            fault: { value: 0, dataType: 'BINARY' }
        },
        outputs: {
            out: { value: 0, dataType: 'FLOAT' }
        },
        circuit: {
            blocks: [
                {
                    typeName: 'AND',
                    inputs: {
                        0: { source: { blockNum: -1, outputNum: 1, inverted: true } },
                        1: { value: 1 },
                        2: { value: 1 }
                    }
                },
                { typeName: 'OR' },
                { typeName: 'RS' },
                { typeName: 'RisingEdge' },
                {
                    typeName: 'Select',
                    inputs: {
                        0: { value: 10 },
                        1: { value: 5 },
                        sel: { source: { blockNum: 1, outputNum: 0 }}
                    }
                },
            ],
            circuitOutputSources: {
                out: { blockNum: 4, outputNum: 0 }
            }
        }
    },
    size: {x: 48, y: 32},
    positions: {
        blocks: [
            {x: 8, y: 4},
            {x: 8, y: 10},
            {x: 8, y: 16},
            {x: 18, y: 4},
            {x: 18, y: 10},
            {x: 18, y: 16},
        ],
        inputs: [4, 6],
        outputs: [4]
    }
}

function testCircuit(view: CircuitView, terminal: ControllerTerminal) {
    view.loadCircuitDefinition(myProg)
    const blocks = view.circuitBlock.circuit.blocks
}

async function app()
{
    const mainMenubar = new HTML.Menubar(document.getElementById('mainMenubar'))
    const circuitMenubar = new CircuitMenuBar(document.getElementById('guiMenubar'))
    const view = new CircuitView(document.getElementById('gui'), vec2(64, 48), vec2(16, 16))
    const terminalMenubar = new HTML.Menubar(document.getElementById('terminalMenubar'))
    const terminal = new ControllerTerminal(document.getElementById('terminal'), null);

    circuitMenubar.attachCircuitView(view)
    // testzone(terminal)
    testCircuit(view, terminal)

    mainMenubar.addItems([
        new HTML.Text('Controller :: ')
    ])

    terminalMenubar.addItems([
        new HTML.Text('Terminal  '),
        new HTML.ActionButton('clear', {
            action: () => terminal.clear()
        }),
    ])
}