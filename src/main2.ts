import * as HTML from './lib/HTML.js'
import { ControllerTerminal } from './Terminal.js';
import { Menubar } from './Lib/HTMLMenubar.js'
import { BlockEventType } from './State/FunctionBlock.js'

import { getFunctionBlock } from './State/FunctionLib.js'
import CircuitView from './View/CircuitView.js'
import Vec2, { vec2 } from './Lib/Vector2.js';

//////////////////////////
//  PROGRAM ENTRY POINT
//
window.onload = () => app().catch(rejected => console.error(rejected))

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
    const terminalMenubar = new Menubar(document.getElementById('terminalMenubar'))

    const guiContainer = document.getElementById('gui')
    
    const terminal = new ControllerTerminal(document.getElementById('terminal'), null);
    
    const view = new CircuitView(guiContainer, vec2(64, 48), vec2(12, 12))

    testzone(terminal)


    mainMenubar.addItems([
        new HTML.Text('Controller :: '),
        new HTML.ActionButton('Test', async () => {
            console.log('Test was pressed.')
        }),
    ])

    terminalMenubar.addItems([
        new HTML.Text('Terminal  '),
        new HTML.ActionButton('Clear', () => terminal.clear()),
    ])
}