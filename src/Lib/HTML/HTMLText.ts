import { domElement, Element } from './HTMLCommon.js'
import { InputField } from './HTMLInput.js'

export class Text extends Element {
    constructor (text: string, options?: {
        style?: Partial<CSSStyleDeclaration>,
        parent?: HTMLElement
    }) {
        super()
        this.DOMElement = domElement(null, 'div', {
            paddingLeft: '2px',
            paddingRight: '4px',
            ...options?.style
        })
        this.setText(text)
        options?.parent?.appendChild(this.DOMElement)
    }
    setText(text: string) { this.DOMElement.textContent = text }
}