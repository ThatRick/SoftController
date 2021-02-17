import * as HTML from '../lib/HTML.js'
import { DropdownMenu } from '../Lib/HTMLDropdownMenu.js'
import { Menubar } from '../Lib/HTMLMenubar.js'
import { instructions } from '../FunctionCollection.js'

import CircuitView from './CircuitView.js'

export class CircuitMenuBar
{
    menu: Menubar

    constructor(parent: HTMLElement)
    {
        this.menu = new Menubar(parent, {
            overflow: 'visible'
        })
    }

    attachCircuit(view: CircuitView) {
        const menu = this.menu

        const funcLibMenus = instructions.libraries.map(lib => {
            const libMenu = new DropdownMenu(lib.name, lib.functions.map(func => func.name))
            libMenu.onItemSelected = (i, name) => {
                view.insertBlock(lib.id, i)
            }
            return libMenu
        })
        
        menu.addItems([
            new HTML.Text(`Circuit (id ${view.circuit.onlineDB})`),
            new HTML.ToggleButton('Immediate', state => view.circuit.setImmediateMode(state), view.circuit.immediateMode),
            new HTML.ActionButton('Upload', { action: async () => view.circuit.sendModifications() }),
            new HTML.Text('Blocks'),
            ...funcLibMenus
        ])
    }

}