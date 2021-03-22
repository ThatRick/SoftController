import { domElement, getInnerHeight } from './HTMLCommon.js';
export class Menubar {
    constructor(parent, style, menuItems = []) {
        this.parent = parent;
        this.style = style;
        this.menuItems = menuItems;
        this.parentHeight = parent.clientHeight;
        const menuBarStyle = {
            boxSizing: 'border-box',
            color: 'white',
            fontFamily: 'system-ui',
            fontSize: Math.round(this.parentHeight * 0.6) + 'px',
            height: '100%',
            padding: '2px',
            paddingTop: '1px',
            borderBottom: 'thin solid black',
            ...style
        };
        this.DOMElement = domElement(parent, 'div', menuBarStyle);
        this.height = getInnerHeight(this.DOMElement);
        this.menuItems = menuItems;
        this.addItems(menuItems);
    }
    addItem(item) {
        this.DOMElement.appendChild(item.DOMElement);
        Object.assign(item.DOMElement.style, {
            display: 'inline-block',
            boxSizing: 'border-box',
            height: '100%',
        });
        const lineHeight = getInnerHeight(item.DOMElement);
        item.DOMElement.style.lineHeight = lineHeight + 'px';
    }
    addItems(items) {
        items.forEach(item => this.addItem(item));
    }
}
