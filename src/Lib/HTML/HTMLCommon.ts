
export const defaultStyle =
{
    colors: {
        base:    '#445',
        light:   '#668',
        active:  '#77D',
        text:   'white',
        altText: '#DDD'
    },
    boxShadow: '0px 2px 2px 1px rgba(0,0,0,0.25)',
    fontSize: 14
}

export type Style = typeof defaultStyle

export interface IElement
{
    DOMElement: HTMLElement
}

export function domElement<K extends keyof HTMLElementTagNameMap>(parentDOM: HTMLElement, tagName: K, style?: Partial<CSSStyleDeclaration>): HTMLElementTagNameMap[K] {
    const elem = document.createElement(tagName)
    Object.assign(elem.style, style)
    parentDOM?.appendChild(elem)
    return elem
}

export class Element {
    DOMElement: HTMLElement
    remove() {
        this.DOMElement?.parentElement?.removeChild(this.DOMElement)
        this.DOMElement = null
    }
    setCSS(style: Partial<CSSStyleDeclaration>) {
        Object.assign(this.DOMElement.style, style)
    }
    style: Style = defaultStyle
}

export class Space extends Element {
    constructor(width: number) {
        super()
        this.DOMElement = domElement(null, 'div', {
            paddingLeft: '2px',
            paddingRight: '2px',
        })
        this.DOMElement.textContent = '⋮'
    }
}

export function getInnerHeight( elm: HTMLElement ) {
    const computed = getComputedStyle(elm)
    const padding = parseInt(computed.paddingTop) + parseInt(computed.paddingBottom)
    const margin = parseInt(computed.marginTop) + parseInt(computed.marginBottom)
    const border = parseInt(computed.borderTop) + parseInt(computed.borderBottom)
    return elm.clientHeight - padding - border
}

