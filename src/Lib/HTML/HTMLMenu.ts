import { domElement, Element } from './HTMLCommon.js'
import { Button } from './HTMLButton.js'

export class Menu extends Element {

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

    attachSubmenu(submenu: Menu) {
        this.remove()
        this.DOMElement = submenu.DOMElement
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
        Object.entries(items).forEach(([name, active], i) => {
            itemStyle ??= { color: '#FFF' }
            disabledItemStyle ??= { color: '#888' }
            const style = (active) ? itemStyle : disabledItemStyle
            const option = new Button(name, menu, {
                border: 'none',
                borderBottom: 'thin solid',
                borderColor: this.style.colors.light,
                paddingLeft: '2px',
                paddingRight: '4px',
                borderRadius: '0',
                ...style
            })
            option.onUp = (active) ? ev => this.onItemSelected?.(i, name): null
        })
        return menu
    }
}