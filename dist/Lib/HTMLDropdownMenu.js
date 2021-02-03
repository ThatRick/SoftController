import { Button, domElement } from './HTML.js';
const arrowDown = ' ⋁';
export class DropdownMenu {
    constructor(name, items, parent) {
        this.DOMElement = domElement(parent, 'div', {
            display: 'inline-block'
        });
        this.buttonName = name;
        this.items = items;
        this.button = new Button(name, this.DOMElement);
        this.menu = this.createMenu(items);
        this.DOMElement.onpointerenter = ev => this.setMenuVisibility('visible');
        this.DOMElement.onpointerleave = ev => this.setMenuVisibility('hidden');
    }
    setMenuVisibility(visibility) {
        this.menu.style.visibility = visibility;
    }
    createMenu(items) {
        const menu = domElement(this.DOMElement, 'div', {
            position: 'absolute',
            display: 'block',
            textAlign: 'left',
            zIndex: '2',
            boxShadow: '0px 2px 2px 2px rgba(0,0,0,0.2)',
            visibility: 'hidden',
            minWidth: '40px'
        });
        this.items.forEach((name, i) => {
            const option = new Button(name, menu, {
                backgroundColor: this.button.color.base,
                borderBottom: 'thin solid',
                paddingLeft: '2px',
                paddingRight: '4px',
                border: 'none',
                borderRadius: '0',
                borderBottomColor: this.button.color.light
            });
            option.onUp = ev => {
                this.onItemSelected?.(i, name);
                this.setMenuVisibility('hidden');
            };
        });
        return menu;
    }
}
