import { Button, domElement, Element } from './HTML.js'

export default class HTMLMenu extends Element {
    items: string[]

    constructor(items: string[], options: {
        parent?: HTMLElement,
        menuStyle?: Partial<CSSStyleDeclaration>,
        itemStyle?: Partial<CSSStyleDeclaration>,
        onItemSelected?: (index: number, name: string) => void
    }) {
        super()
        this.items = items
        this.DOMElement = this.createMenu(items, options?.menuStyle, options?.itemStyle)
        options?.parent?.appendChild(this.DOMElement)
        this.onItemSelected = options?.onItemSelected
    }

    onItemSelected?: (index: number, name: string) => void

    protected createMenu(items: string[], menuStyle?: Partial<CSSStyleDeclaration>, itemStyle?: Partial<CSSStyleDeclaration>) {
        const menu = domElement(this.DOMElement, 'div', {
            position: 'absolute',
            display: 'block',
            textAlign: 'left',
            zIndex: '2',
            boxShadow: '0px 2px 2px 2px rgba(0,0,0,0.2)',
            minWidth: '40px',
            ...menuStyle
        })
        this.items.forEach((name, i) => {
            const option = new Button(name, menu, {
                border: 'none',
                borderBottom: 'thin solid',
                borderColor: this.style.colors.light,
                paddingLeft: '2px',
                paddingRight: '4px',
                borderRadius: '0',
                ...itemStyle
            })
            option.onUp = ev => this.onItemSelected?.(i, name)
        })
        return menu
    }
}