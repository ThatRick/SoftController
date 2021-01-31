import { Vec2 } from '../GUI/GUITypes.js';
import {IElement, domElement }from './HTML.js'

export class Menubar
{
    height: number
    DOMElement: HTMLDivElement
    constructor (
        private parent: HTMLElement,
        private style?: Partial<CSSStyleDeclaration>,
        private menuItems: IElement[] = [])
    {
        this.height = parent.clientHeight
        console.log('menu height', parent.clientHeight, this.height)
        const menuBarStyle = {
            color: 'white',
            fontFamily: 'system-ui',
            fontSize: Math.round(this.height * 0.6) + 'px',
            padding: '2px',
            borderBottom: 'thin solid black',
            ...style
        } as Partial<CSSStyleDeclaration>

        this.DOMElement = domElement(parent, 'div', menuBarStyle)
        this.menuItems = menuItems
    }

    addItem(item: IElement) {
        item.DOMElement.style.display = 'inline-block'
        item.DOMElement.style.height = '100%'
        this.DOMElement.appendChild(item.DOMElement)
    }
    addItems(items: IElement[]) {
        items.forEach(item => this.addItem(item))
    }

}