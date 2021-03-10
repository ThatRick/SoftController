import { Button, domElement, Element } from './HTML.js'

export default class HTMLMenu extends Element {

    constructor(items: Record<string, unknown>, options: {
        parent?: HTMLElement,
        menuStyle?: Partial<CSSStyleDeclaration>,
        itemStyle?: Partial<CSSStyleDeclaration>,
        disabledItemStyle?: Partial<CSSStyleDeclaration>,
        onItemSelected?: (index: number, name: string) => void
    }) {
        super()
        this.DOMElement = this.createMenu(items, options?.menuStyle, options?.itemStyle, options?.disabledItemStyle)
        options?.parent?.appendChild(this.DOMElement)
        this.onItemSelected = options?.onItemSelected
    }

    onItemSelected?: (index: number, name: string) => void

    protected createMenu(items: Record<string, unknown>, menuStyle?: Partial<CSSStyleDeclaration>,
        itemStyle?: Partial<CSSStyleDeclaration>, disabledItemStyle?: Partial<CSSStyleDeclaration>) {

        const menu = domElement(this.DOMElement, 'div', {
            position: 'absolute',
            display: 'block',
            textAlign: 'left',
            zIndex: '2',
            backgroundColor: this.style.colors.base,
            boxShadow: this.style.boxShadow,
            minWidth: '40px',
            ...menuStyle
        })
        Object.entries(items).forEach(([name, action], i) => {
            itemStyle ??= { color: '#FFF' }
            disabledItemStyle ??= { color: '#888' }
            const style = (action) ? itemStyle : disabledItemStyle
            const option = new Button(name, menu, {
                border: 'none',
                borderBottom: 'thin solid',
                borderColor: this.style.colors.light,
                paddingLeft: '2px',
                paddingRight: '4px',
                borderRadius: '0',
                ...style
            })
            option.onUp = (action) ? ev => this.onItemSelected?.(i, name): null
        })
        return menu
    }
}