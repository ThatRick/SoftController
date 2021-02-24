import { Vec2 } from '../GUI/GUITypes.js';
import * as HTML from './HTML.js'

export class Menubar
{
    parentHeight: number
    height: number
    DOMElement: HTMLDivElement

    constructor (
        private parent: HTMLElement,
        private style?: Partial<CSSStyleDeclaration>,
        private menuItems: HTML.IElement[] = [])
    {
        this.parentHeight = parent.clientHeight
        
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
        } as Partial<CSSStyleDeclaration>
        
        this.DOMElement = HTML.domElement(parent, 'div', menuBarStyle)
        this.height = HTML.getInnerHeight(this.DOMElement)
        this.menuItems = menuItems
        this.addItems(menuItems)
    }

    addItem(item: HTML.IElement) {
        this.DOMElement.appendChild(item.DOMElement)
        Object.assign(item.DOMElement.style, {
            display: 'inline-block',
            boxSizing: 'border-box',
            height: '100%',
        })
        const lineHeight = HTML.getInnerHeight(item.DOMElement)
        item.DOMElement.style.lineHeight = lineHeight + 'px'
    }
    addItems(items: HTML.IElement[]) {
        items.forEach(item => this.addItem(item))
    }
}