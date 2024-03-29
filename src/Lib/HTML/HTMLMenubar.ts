import Vec2 from '../Vector2.js';
import {IElement, domElement, getInnerHeight} from './HTMLCommon.js'

export class Menubar
{
    parentHeight: number
    height: number
    DOMElement: HTMLDivElement

    constructor (
        private parent: HTMLElement,
        private style?: Partial<CSSStyleDeclaration>,
        private menuItems: IElement[] = [])
    {
        this.parentHeight = parent.clientHeight
        
        const menuBarStyle = {
            boxSizing: 'border-box',
            color: 'white',
            fontFamily: 'Calibri, sans-serif',
            fontSize: Math.round(this.parentHeight * 0.65) + 'px',
            height: '100%',
            padding: '2px',
            paddingTop: '1px',
            borderBottom: 'thin solid black',
            ...style
        } as Partial<CSSStyleDeclaration>
        
        this.DOMElement = domElement(parent, 'div', menuBarStyle)
        this.height = getInnerHeight(this.DOMElement)
        this.menuItems = menuItems
        this.addItems(menuItems)
    }

    addItem(item: IElement) {
        this.DOMElement.appendChild(item.DOMElement)
        Object.assign(item.DOMElement.style, {
            display: 'inline-block',
            boxSizing: 'border-box',
            height: '100%',
        })
        const lineHeight = '100%' // getInnerHeight(item.DOMElement)
        item.DOMElement.style.lineHeight = lineHeight + 'px'
    }
    addItems(items: IElement[]) {
        items.forEach(item => this.addItem(item))
    }
}