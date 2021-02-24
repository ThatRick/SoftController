import { Button, domElement, Element } from './HTML.js';
export default class HTMLMenu extends Element {
    constructor(items, options) {
        super();
        this.items = items;
        this.DOMElement = this.createMenu(items, options?.menuStyle, options?.itemStyle);
        options?.parent?.appendChild(this.DOMElement);
        this.onItemSelected = options?.onItemSelected;
    }
    createMenu(items, menuStyle, itemStyle) {
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
        this.items.forEach((name, i) => {
            const option = new Button(name, menu, {
                border: 'none',
                borderBottom: 'thin solid',
                borderColor: this.style.colors.light,
                paddingLeft: '2px',
                paddingRight: '4px',
                borderRadius: '0',
                ...itemStyle
            });
            option.onUp = ev => this.onItemSelected?.(i, name);
        });
        return menu;
    }
}
