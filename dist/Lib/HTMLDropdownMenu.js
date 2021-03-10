import { Button, domElement } from './HTML.js';
import HTMLMenu from './HTMLMenu.js';
const arrowDown = ' ⋁';
export class DropdownMenu {
    constructor(name, options) {
        this.DOMElement = domElement(options.parent, 'div', {
            display: 'inline-block'
        });
        this.buttonName = name;
        this.items = options.items;
        this.button = new Button(name, this.DOMElement);
        this.menu = new HTMLMenu(options.items.reduce((obj, name) => obj[name] = true, {}), {
            parent: this.DOMElement,
            menuStyle: { visibility: 'hidden' }
        });
        this.menu.onItemSelected = (index, name) => {
            this.onItemSelected(index, name);
            this.setMenuVisibility('hidden');
        };
        this.DOMElement.onpointerenter = ev => this.setMenuVisibility('visible');
        this.DOMElement.onpointerleave = ev => this.setMenuVisibility('hidden');
    }
    setMenuVisibility(visibility) {
        this.menu.DOMElement.style.visibility = visibility;
    }
}
