import { domElement, Element } from './HTMLCommon.js'

export class Button extends Element
{
    declare DOMElement: HTMLDivElement
    onClick?: (ev: MouseEvent) => void
    onDown?: (ev: PointerEvent) => void
    onUp?: (ev: PointerEvent) => void

    backgroundColor = this.style.colors.base

    constructor(text: string, parent?: HTMLElement, style?: Partial<CSSStyleDeclaration>) {
        super()
        this.DOMElement = domElement(null, 'div', {
            color: 'white',
            paddingLeft: '3px',
            paddingRight: '3px',
            marginLeft: '1px',
            marginRight: '1px',
            backgroundColor: this.style.colors.base,
            border: '1px solid ' + this.style.colors.light,
            borderRadius: '2px',
            textAlign: 'center',
            userSelect: 'none',
            cursor: 'pointer',
            ...style
        })
        this.DOMElement.textContent = text

        this.DOMElement.onpointerenter = ev => this.DOMElement.style.backgroundColor = this.style.colors.light
        this.DOMElement.onpointerleave = ev => this.DOMElement.style.backgroundColor = this.backgroundColor
        
        this.DOMElement.onclick = ev => {
            ev.stopPropagation()
            this.onClick?.(ev)
        }
        this.DOMElement.onpointerdown = ev => {
            ev.stopPropagation()
            this.onDown?.(ev)
        }
        this.DOMElement.onpointerup = ev => {
            ev.stopPropagation()
            this.onUp?.(ev)
        }
        parent?.appendChild(this.DOMElement)
    }

    flash(color: string) {
        this.DOMElement.style.backgroundColor = color
        setTimeout(() => {
            this.DOMElement.style.backgroundColor = this.backgroundColor
        }, 30)
    }
}

export class ActionButton extends Button
{
    constructor(name: string, options: {
        action: () => void,
        parent?:    HTMLElement,
        style?:     Partial<CSSStyleDeclaration>,
    }) {
        super(name, options.parent, options.style)

        this.onClick = () => {

            this.flash(this.style.colors.active)
            options.action()
        }
    }
}

export class ToggleButton extends Button
{
    state: boolean
    colors: []
    constructor(text: string, toggle: (state: boolean) => boolean, initState=false, parent?: HTMLElement) {
        super(text, parent)
        this.state = initState
        this.updateStyle()

        this.onClick = () => {
            this.state = toggle(!this.state)
            this.updateStyle()
            this.flash(this.style.colors.active)
        }
    }
    updateStyle() {
        this.backgroundColor = this.state ? this.style.colors.light : this.style.colors.base
        this.setCSS({
            backgroundColor: this.backgroundColor,
            borderColor: this.state ? 'white' : this.style.colors.light
        })
    }
}