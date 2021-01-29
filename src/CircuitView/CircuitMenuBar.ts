import { GUIMenubar } from "../GUI/GUIMenubar.js";
import * as HTML from '../lib/HTML.js'
import { Circuit } from "./CircuitState.js";

export class CircuitMenuBar
{
    menu: GUIMenubar

    constructor(parent: HTMLElement)
    {
        this.menu = new GUIMenubar(parent)
    }

    attachCircuit(circuit: Circuit) {
        const menu = this.menu
        menu.addItems([
            new HTML.Text('Circuit'),
            new HTML.ToggleButton('Immediate', state => circuit.setImmediateMode(state), circuit.immediateMode),
            new HTML.Button('Upload', async () => {
                await circuit.sendModifications()
            }),
        ])
    }

}