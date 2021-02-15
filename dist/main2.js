import * as HTML from './lib/HTML.js';
import { ControllerTerminal } from './Terminal.js';
import { Menubar } from './Lib/HTMLMenubar.js';
import { getFunctionBlock } from './State/FunctionLib.js';
import CircuitView from './View/CircuitView.js';
import { vec2 } from './Lib/Vector2.js';
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
    const terminalMenubar = new Menubar(document.getElementById('terminalMenubar'));
    const guiContainer = document.getElementById('gui');
    const terminal = new ControllerTerminal(document.getElementById('terminal'), null);
    const view = new CircuitView(guiContainer, vec2(64, 48), vec2(12, 12));
    testzone(terminal);
    mainMenubar.addItems([
        new HTML.Text('Controller :: '),
        new HTML.ActionButton('Test', async () => {
            console.log('Test was pressed.');
        }),
    ]);
    terminalMenubar.addItems([
        new HTML.Text('Terminal  '),
        new HTML.ActionButton('Clear', () => terminal.clear()),
    ]);
}