import * as HTML from '../lib/HTML.js';
import { DropdownButton } from '../Lib/HTMLDropdownButton.js';
import { Menubar } from '../Lib/HTMLMenubar.js';
export class CircuitMenuBar {
    constructor(parent) {
        this.menu = new Menubar(parent, {
            overflow: 'visible'
        });
    }
    attachCircuit(circuit) {
        const menu = this.menu;
        menu.addItems([
            new HTML.Text('Circuit'),
            new HTML.ToggleButton('Immediate', state => circuit.setImmediateMode(state), circuit.immediateMode),
            new HTML.Button('Upload', async () => {
                await circuit.sendModifications();
            }),
            new DropdownButton('Logic', ['One', 'Two', 'Three'])
        ]);
    }
}
