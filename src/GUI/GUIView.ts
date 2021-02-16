import { IChildElementGUI, GUIPointerState, IElementGUI, IRootViewGUI, IStyleGUI, GUIPointerEventHandler } from './GUITypes.js'
import Vec2, {vec2} from '../Lib/Vector2.js'
import GUIContainer from './GUIContainer.js'
import { GUIChildElement } from './GUIChildElement.js'
import * as HTML from './../Lib/HTML.js'
import GUIPointer from './GUIPointer.js'



interface Updateable {
    update(force?: boolean): boolean
}

export default class GUIView<Element extends IChildElementGUI, Style extends IStyleGUI> implements IElementGUI, IRootViewGUI { 

    DOMElement: HTMLElement

    gui = this
    children: GUIContainer<Element>

    eventTargetMap = new WeakMap<EventTarget, Element>()
    updateRequests = new Set<Updateable>()

    pos = vec2(0, 0)
    absPos = vec2(0, 0)
    
    private _size: Vec2
    setSize(v: Vec2) {
        if (this._size?.equal(v)) return
        this._size = Object.freeze(v.copy())
        this._resize()
    }
    get size() { return this._size }

    private _resize() {
        this.DOMElement.style.width = this._size.x * this._scale.x + 'px'
        this.DOMElement.style.height = this._size.y * this._scale.y + 'px'
    }
    
    private _scale: Vec2
    rescale(scale: Vec2) {
        if (this._scale?.equal(scale)) return
        this._scale = Object.freeze(scale.copy())
        this._resize()
        this.children?.rescale(scale)
    }
    get scale() { return this._scale }
    
    private _style: Style
    restyle(style: Style) {
        this._style = Object.freeze(style)
        this.children?.restyle(style)
    }
    get style(): Style { return this._style }

    pointer: GUIPointer<Element, Style>

    constructor(
        public parentDOM: HTMLElement,
        size: Vec2,
        scale: Vec2,
        style: Style,
        css?: Partial<CSSStyleDeclaration>
    ) {
        this.DOMElement = document.createElement('div')
        parentDOM.appendChild(this.DOMElement)

        const defaultStyle: Partial<CSSStyleDeclaration> = {
            position: 'relative',
            top: '0px',
            left: '0px',
        }
 
        Object.assign(this.DOMElement.style, defaultStyle, css)

        this._size = size
        this.rescale(scale)
        this.restyle(style)

        this.children = new GUIContainer(this)
        this.pointer = new GUIPointer(this)

        this.setup?.()

        requestAnimationFrame(this.update.bind(this))
    }

    update() {
        this.pointer.update()
        this.updateRequests.forEach(elem => {
            const keep = elem.update()
            if (!keep) this.updateRequests.delete(elem)
        })

        this.loop?.()

        requestAnimationFrame(this.update.bind(this))

        return false
    }

    delete() {
        this.children?.delete()
        this.parentDOM.removeChild(this.DOMElement)
        requestAnimationFrame(null)
    }

    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //   User defined functions
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤

    setup?(): void

    loop?(): void

    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //     Element handling
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤

    registerElement(elem: Element) {
        this.eventTargetMap.set(elem.DOMElement, elem)
    }

    unregisterElement(elem: Element) {
        this.eventTargetMap.delete(elem.DOMElement)
    }

    requestElementUpdate(elem: Element) {
        this.updateRequests.add(elem)
    }

    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //   Pointer events
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    
    onPointerEnter?: (ev: PointerEvent) => void
    onPointerDown?:  (ev: PointerEvent) => void
    onPointerMove?:  (ev: PointerEvent) => void
    onPointerUp?:    (ev: PointerEvent) => void
    onClicked?:      (ev: PointerEvent) => void
    onDoubleClicked?:(ev: PointerEvent) => void
    onDragStarted?:  (ev: PointerEvent) => void
    onDragging?:     (ev: PointerEvent) => void
    onDragEnded?:    (ev: PointerEvent) => void

}