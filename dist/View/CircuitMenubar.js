import * as HTML from '../lib/HTML.js';
import { Menubar } from '../Lib/HTMLMenubar.js';
export class CircuitMenuBar {
    constructor(parent) {
        this.menu = new Menubar(parent, {
            overflow: 'visible'
        });
    }
    attachCircuit(view) {
        const menu = this.menu;
        menu.addItems([
            new HTML.Text('Scale'),
        ]);
    }
}
