import { Vec2 } from './GUITypes';
import * as HTML from '../Lib/HTML.js'

interface IMenuStyle
{

}

interface IMenuItem
{
    DOMElement: HTMLElement
}

export class Menubar
{
    height: number
    DOMElement: HTMLDivElement
    constructor (
        private parent: HTMLElement,
        private style?: Partial<CSSStyleDeclaration>,
        private menuItems: IMenuItem[] = [])
    {
        this.height = parent.clientHeight
        console.log('menu height', parent.clientHeight, this.height)
        const menuBarStyle = {
            color: 'white',
            fontFamily: 'monospace',
            fontSize: Math.round(this.height * 0.6) + 'px',
            borderBottom: 'thin solid black',
            ...style
        } as Partial<CSSStyleDeclaration>

        this.DOMElement = HTML.domElement(parent, 'div', menuBarStyle)
        this.menuItems = menuItems
    }

    addItem(item: IMenuItem) {
        this.DOMElement.appendChild(item.DOMElement)
    }
    addItems(items: IMenuItem[]) {
        items.forEach(item => this.addItem(item))
    }

}