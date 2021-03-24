import { domElement, Element } from './HTMLCommon.js';
import { Button } from './HTMLButton.js';
export class Menu extends Element {
    constructor(items, options) {
        super();
        this.DOMElement = this.createMenu(items, options?.menuStyle, options?.itemStyle, options?.disabledItemStyle);
        options?.parent?.appendChild(this.DOMElement);
        this.onItemSelected = options?.onItemSelected;
    }
    attachSubmenu(submenu) {
        this.remove();
        this.DOMElement = submenu.DOMElement;
    }
    updateMenu(items) {
        const newMenu = this.createMenu(items, this.options?.menuStyle, this.options?.itemStyle, this.options?.disabledItemStyle);
        this.options?.parent?.replaceChild(newMenu, this.DOMElement);
    }
    createMenu(items, menuStyle, itemStyle, disabledItemStyle) {
        const menu = domElement(null, 'div', {
            position: 'absolute',
            display: 'block',
            textAlign: 'left',
            zIndex: '3',
            backgroundColor: this.style.colors.base,
            boxShadow: this.style.boxShadow,
            minWidth: '40px',
            ...menuStyle
        });
        Object.entries(items).forEach(([name, active], i) => {
            itemStyle ??= { color: '#FFF' };
            disabledItemStyle ??= { color: '#888' };
            const style = (active) ? itemStyle : disabledItemStyle;
            const menuItem = new Button(name, menu, {
                border: 'none',
                borderBottom: 'thin solid',
                borderColor: this.style.colors.light,
                paddingLeft: '2px',
                paddingRight: '4px',
                borderRadius: '0',
                ...style
            });
            menuItem.onUp = (active) ? ev => this.onItemSelected?.(i, name) : null;
        });
        return menu;
    }
}
