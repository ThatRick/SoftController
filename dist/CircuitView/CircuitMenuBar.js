import { GUIMenubar } from "../GUI/GUIMenubar.js";
import * as HTML from '../lib/HTML.js';
export class CircuitMenuBar {
    constructor(parent) {
        this.menu = new GUIMenubar(parent);
    }
    attachCircuit(circuit) {
        const menu = this.menu;
        menu.addItems([
            new HTML.Text('Circuit'),
            new HTML.ToggleButton('Immediate', state => circuit.setImmediateMode(state), circuit.immediateMode),
            new HTML.Button('Upload', async () => {
                await circuit.sendModifications();
            }),
        ]);
    }
}
