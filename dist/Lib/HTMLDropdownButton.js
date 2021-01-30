import { ButtonBase, domElement } from './HTML.js';
export class DropdownButton extends ButtonBase {
    constructor(name, items, parent) {
        super(name + ' ⋁', parent);
        this.buttonName = name;
        this.items = items;
        this.createDropdownMenu();
    }
    createDropdownMenu() {
        const menu = domElement(this.DOMElement, 'div', {
            position: 'absolute',
            display: 'block',
            zIndex: '9'
        });
        this.items.forEach((name, i) => {
            const option = document.createElement('div');
            option.textContent = name;
            menu.appendChild(option);
        });
        this.menu = menu;
    }
}
