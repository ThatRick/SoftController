import * as HTML from '../Lib/HTML.js';
export class Menubar {
    constructor(parent, style, menuItems = []) {
        this.parent = parent;
        this.style = style;
        this.menuItems = menuItems;
        this.height = parent.clientHeight;
        console.log('menu height', parent.clientHeight, this.height);
        const menuBarStyle = {
            color: 'white',
            fontFamily: 'monospace',
            fontSize: Math.round(this.height * 0.6) + 'px',
            borderBottom: 'thin solid black',
            ...style
        };
        this.DOMElement = HTML.domElement(parent, 'div', menuBarStyle);
        this.menuItems = menuItems;
    }
    addItem(item) {
        this.DOMElement.appendChild(item.DOMElement);
    }
    addItems(items) {
        items.forEach(item => this.addItem(item));
    }
}
