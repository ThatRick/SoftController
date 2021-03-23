import * as HTML from '../Lib/HTML.js'
import { instructions } from '../FunctionCollection.js'

import CircuitView from './CircuitView.js'

export class CircuitMenuBar
{
    menu: HTML.Menubar

    constructor(parent: HTMLElement)
    {
        this.menu = new HTML.Menubar(parent, {
            overflow: 'visible'
        })
    }

    attachCircuit(view: CircuitView) {
        const menu = this.menu

        
        const funcLibMenus = instructions.libraries.map(lib => {
            const menuItems = lib.functions.reduce((obj, func) => {
                obj[func.name] = true
                return obj
            }, {})
            const libMenu = new HTML.DropdownMenu(lib.name, {
                getItems: () => menuItems,
                onItemSelected: (i, name) => {
                    view.insertBlock(lib.id, i)
                }
            })
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