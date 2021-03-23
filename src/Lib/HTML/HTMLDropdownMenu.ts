import { domElement, Element } from './HTMLCommon.js'
import { Button } from './HTMLButton.js'
import { Menu } from './HTMLMenu.js'

const arrowDown = ' ⋁'

export class DropdownMenu extends Element
{
    protected button: Button
    protected menu: Menu

    protected getItems: () => Record<string, unknown>
    protected onItemSelected: (index: number, name: string) => void

    constructor(name: string, options: {
        parent?: HTMLElement,
        getItems: () => Record<string, unknown>,
        onItemSelected: (index: number, name: string) => void
    }) {
        super()
        
        this.getItems = options.getItems
        this.onItemSelected = options.onItemSelected

        this.DOMElement = domElement(options.parent, 'div', {
            display: 'inline-block'
        })

        this.button = new Button(name, this.DOMElement)

        const items = this.getItems()
        console.log('menu items:', items)

        this.menu = new Menu(items, {
            parent: this.DOMElement,
            menuStyle: { visibility: 'hidden' },
            onItemSelected: (index: number, name: string) => {
                this.onItemSelected(index, name)
                this.setMenuVisibility('hidden')
            },
        })
        
        this.DOMElement.onpointerenter = ev => this.setMenuVisibility('visible')
        this.DOMElement.onpointerleave = ev => this.setMenuVisibility('hidden')
    }
    
    protected setMenuVisibility(visibility: 'hidden' | 'visible') {
        if (visibility == 'visible') {
            const items = this.getItems()
            this.menu.updateMenu(items)
        }
        this.menu.DOMElement.style.visibility = visibility
    }
}