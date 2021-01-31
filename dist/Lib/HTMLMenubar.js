import { domElement } from './HTML.js';
export class Menubar {
    constructor(parent, style, menuItems = []) {
        this.parent = parent;
        this.style = style;
        this.menuItems = menuItems;
        this.height = parent.clientHeight;
        console.log('menu height', parent.clientHeight, this.height);
        const menuBarStyle = {
            color: 'white',
            fontFamily: 'system-ui',
            fontSize: Math.round(this.height * 0.6) + 'px',
            padding: '2px',
            borderBottom: 'thin solid black',
            ...style
        };
        this.DOMElement = domElement(parent, 'div', menuBarStyle);
        this.menuItems = menuItems;
    }
    addItem(item) {
        item.DOMElement.style.display = 'inline-block';
        item.DOMElement.style.height = '100%';
        this.DOMElement.appendChild(item.DOMElement);
    }
    addItems(items) {
        items.forEach(item => this.addItem(item));
    }
}
