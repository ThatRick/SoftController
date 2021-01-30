import * as HTML from '../lib/HTML.js'
import { DropdownButton } from '../Lib/HTMLDropdownButton.js';
import { Menubar } from '../Lib/HTMLMenubar.js';

import { Circuit } from "./CircuitState.js";

export class CircuitMenuBar
{
    menu: Menubar

    constructor(parent: HTMLElement)
    {
        this.menu = new Menubar(parent, {
            overflow: 'visible'
        })
    }

    attachCircuit(circuit: Circuit) {
        const menu = this.menu
        menu.addItems([
            new HTML.Text('Circuit'),
            new HTML.ToggleButton('Immediate', state => circuit.setImmediateMode(state), circuit.immediateMode),
            new HTML.Button('Upload', async () => {
                await circuit.sendModifications()
            }),
            new DropdownButton('Logic', ['One', 'Two', 'Three'])
        ])
    }

}