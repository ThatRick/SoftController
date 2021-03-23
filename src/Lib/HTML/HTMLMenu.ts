import { domElement, Element } from './HTMLCommon.js'
import { Button } from './HTMLButton.js'

interface MenuOptions
{
    parent?: HTMLElement,
    menuStyle?: Partial<CSSStyleDeclaration>,
    itemStyle?: Partial<CSSStyleDeclaration>,
    disabledItemStyle?: Partial<CSSStyleDeclaration>,
    onItemSelected?: (index: number, name: string) => void
}

export class Menu extends Element
{
    constructor(items: Record<string, unknown>, options: MenuOptions)
    {
        super()
        this.DOMElement = this.createMenu(items, options?.menuStyle, options?.itemStyle, options?.disabledItemStyle)
        options?.parent?.appendChild(this.DOMElement)
        this.onItemSelected = options?.onItemSelected
    }

    attachSubmenu(submenu: Menu) {
        this.remove()
        this.DOMElement = submenu.DOMElement
    }

    updateMenu(items: Record<string, unknown>) {
        const newMenu = this.createMenu(items, this.options?.menuStyle, this.options?.itemStyle, this.options?.disabledItemStyle)
        this.options?.parent?.replaceChild(newMenu, this.DOMElement)
    }

    protected options: MenuOptions

    protected onItemSelected?: (index: number, name: string) => void

    protected createMenu(items: Record<string, unknown>, menuStyle?: Partial<CSSStyleDeclaration>,
        itemStyle?: Partial<CSSStyleDeclaration>, disabledItemStyle?: Partial<CSSStyleDeclaration>) {

        const menu = domElement(null, 'div', {
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
            
            const menuItem = new Button(name, menu, {
                border: 'none',
                borderBottom: 'thin solid',
                borderColor: this.style.colors.light,
                paddingLeft: '2px',
                paddingRight: '4px',
                borderRadius: '0',
                ...style
            })
            menuItem.onUp = (active) ? ev => this.onItemSelected?.(i, name): null
        })
        return menu
    }
}