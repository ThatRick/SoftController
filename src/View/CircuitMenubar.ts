import * as HTML from '../lib/HTML.js'
import { DropdownMenu } from '../Lib/HTMLDropdownMenu.js'
import { Menubar } from '../Lib/HTMLMenubar.js'

import Circuit from '../State/Circuit.js'

export class CircuitMenuBar
{
    menu: Menubar

    constructor(parent: HTMLElement)
    {
        this.menu = new Menubar(parent, {
            overflow: 'visible'
        })
    }

    attachCircuit(view: Circuit) {
        const menu = this.menu
        
        menu.addItems([
            new HTML.Text('Scale'),
        ])
    }

}