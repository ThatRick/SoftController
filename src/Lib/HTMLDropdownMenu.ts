import { Button, domElement } from './HTML.js'
import HTMLMenu from './HTMLMenu.js'

const arrowDown = ' ⋁'

export class DropdownMenu {
    items: string[]
    buttonName: string
    DOMElement: HTMLDivElement
    button: Button
    menu: HTMLMenu

    constructor(name: string, options: {
        items: string[],
        parent?: HTMLElement
    }) {
        this.DOMElement = domElement(options.parent, 'div', {
            display: 'inline-block'
        })
        this.buttonName = name
        this.items = options.items

        this.button = new Button(name, this.DOMElement)
        this.menu = new HTMLMenu(options.items.reduce((obj, name) => obj[name] = true, {}), {
            parent: this.DOMElement,
            menuStyle: { visibility: 'hidden' }
        })
        
        this.menu.onItemSelected = (index: number, name: string) => {
            this.onItemSelected(index, name)
            this.setMenuVisibility('hidden')
        }

        this.DOMElement.onpointerenter = ev => this.setMenuVisibility('visible')
        this.DOMElement.onpointerleave = ev => this.setMenuVisibility('hidden')
    }
    onItemSelected?: (index: number, name: string) => void

    setMenuVisibility(visibility: 'hidden' | 'visible') {
        this.menu.DOMElement.style.visibility = visibility
    }
}