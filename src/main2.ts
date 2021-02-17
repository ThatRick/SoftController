import * as HTML from './lib/HTML.js'
import { ControllerTerminal } from './Terminal.js';
import { Menubar } from './Lib/HTMLMenubar.js'
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

const myProg: CircuitViewDefinition = {
    definition: {
        name: 'My circuit',
        inputs: {
            meas: { value: 123, dataType: 'FLOAT' },
            fault: { value: 0, dataType: 'BINARY' }
        },
        outputs: {
            out: { value: 0, dataType: 'FLOAT' }
        },
        circuit: {
            blocks: [
                { typeName: 'AND' },
                { typeName: 'OR' },
                { typeName: 'RS' },
                { typeName: 'RisingEdge' },
                { typeName: 'Select' },
            ]
        }
    },
    size: {x: 40, y: 30},
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
    blocks[0].setVariableInputCount(3)
}

function testzone(terminal: ControllerTerminal) {
    const and = getFunctionBlock({typeName: 'AND'})
    and.events.subscribe(ev => {
        switch(ev.type)
        {
            case BlockEventType.InputCount:
                console.log('Function block input count changed')
                break
            case BlockEventType.Test:
                console.log('Got test event')
                break
        }
    }, [BlockEventType.Test])

    and.inputs[0].setValue(0)
    and.update(1)
    terminal.print(and.toString())
    
    and.inputs[0].setValue(1)
    and.update(1)
    terminal.print(and.toString())
    
    and.setVariableInputCount(3)
    and.update(1)
    terminal.print(and.toString())
    and.events.emit(BlockEventType.Test)

}

async function app()
{
    const mainMenubar = new Menubar(document.getElementById('mainMenubar'))
    const circuitMenubar = new CircuitMenuBar(document.getElementById('guiMenubar'))
    const view = new CircuitView(document.getElementById('gui'), vec2(64, 48), vec2(12, 12))
    const terminalMenubar = new Menubar(document.getElementById('terminalMenubar'))
    const terminal = new ControllerTerminal(document.getElementById('terminal'), null);

    circuitMenubar.attachCircuitView(view)
    // testzone(terminal)
    testCircuit(view, terminal)

    mainMenubar.addItems([
        new HTML.Text('Controller :: ')
    ])

    terminalMenubar.addItems([
        new HTML.Text('Terminal  '),
        new HTML.ActionButton({
            name: 'clear',
            action: () => terminal.clear()
        }),
    ])
}