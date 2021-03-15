import { Button, domElement, Element } from './HTML.js';
export default class HTMLMenu extends Element {
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
    createMenu(items, menuStyle, itemStyle, disabledItemStyle) {
        const menu = domElement(this.DOMElement, 'div', {
            position: 'absolute',
            display: 'block',
            textAlign: 'left',
            zIndex: '2',
            backgroundColor: this.style.colors.base,
            boxShadow: this.style.boxShadow,
            minWidth: '40px',
            ...menuStyle
        });
        Object.entries(items).forEach(([name, active], i) => {
            itemStyle ??= { color: '#FFF' };
            disabledItemStyle ??= { color: '#888' };
            const style = (active) ? itemStyle : disabledItemStyle;
            const option = new Button(name, menu, {
                border: 'none',
                borderBottom: 'thin solid',
                borderColor: this.style.colors.light,
                paddingLeft: '2px',
                paddingRight: '4px',
                borderRadius: '0',
                ...style
            });
            option.onUp = (active) ? ev => this.onItemSelected?.(i, name) : null;
        });
        return menu;
    }
}
