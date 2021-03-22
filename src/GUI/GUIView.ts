import { IChildElementGUI, GUIPointerState, IElementGUI, IRootViewGUI, IStyleGUI, GUIPointerEventHandler } from './GUITypes.js'
import Vec2, {vec2} from '../Lib/Vector2.js'
import GUIContainer from './GUIContainer.js'
import GUIPointer from './GUIPointer.js'
import { EventEmitter } from '../Lib/Events.js'


interface Updateable {
    update(force?: boolean): boolean | void
}

export const enum GUIEventType {
    Resized,
    Rescaled,
    Restyled,
    Removed
}

export interface GUIEvent {
    type:   GUIEventType
    source: IRootViewGUI
}

export default class GUIView<Element extends IChildElementGUI, Style extends IStyleGUI> implements IElementGUI, IRootViewGUI { 

    DOMElement: HTMLElement

    gui = this

    pos = vec2(0, 0)
    absPos = vec2(0, 0)
    
    get size() { return this._size }
    get scale() { return this._scale }
    get style(): Style { return this._style }

    resize(v: Vec2) {
        if (this._size?.equal(v)) return
        this._size = Object.freeze(v.copy())
        this._resize()
        this.onResize?.()
        this.events.emit(GUIEventType.Resized)
    }
    rescale(scale: Vec2) {
        if (this._scale?.equal(scale)) return
        this._scale = Object.freeze(scale.copy())
        this._resize()
        this.onRescale?.()
        this.children?.rescale(scale)
        this.events.emit(GUIEventType.Rescaled)
    }
    restyle(style: Style) {
        this._style = Object.freeze(style)
        this.onRestyle?.()
        this.children?.restyle(style)
        this.events.emit(GUIEventType.Restyled)
    }
    parentMoved() {
        this.children?.parentMoved()
    }

    pointer: GUIPointer<Element, Style>

    events = new EventEmitter<GUIEvent>(this)


    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //                CONSTRUCTOR  
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤

    constructor (
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

        this._size = Object.freeze(size.copy())
        this._scale = Object.freeze(scale.copy())
        this._style = Object.freeze(style)

        this.children = new GUIContainer(this)
        this.pointer = new GUIPointer(this)

        requestAnimationFrame(this.update.bind(this))
    }
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //            PRIVATE & PROTECTED  
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    
    private _scale: Vec2
    private _size: Vec2
    private _style: Style

    private _resize() {
        this.DOMElement.style.width = this._size.x * this._scale.x + 'px'
        this.DOMElement.style.height = this._size.y * this._scale.y + 'px'
    }
    
    children: GUIContainer<Element>

    eventTargetMap = new WeakMap<EventTarget, Element>()
    
    protected updateRequests = new Set<Updateable>()

    update() {
        this.pointer.update()
        this.updateRequests.forEach(elem => {
            const keep = elem.update()
            if (!keep) this.updateRequests.delete(elem)
        })

        this.onUpdate?.()

        requestAnimationFrame(this.update.bind(this))

        return false
    }

    setStyle(style: Partial<CSSStyleDeclaration>) {
        Object.assign(this.DOMElement.style, style)
    }

    delete() {
        this.children?.delete()
        this.eventTargetMap = null
        this.updateRequests.clear()
        this.parentDOM.removeChild(this.DOMElement)
        requestAnimationFrame(null)
        this.events.emit(GUIEventType.Removed)
        this.events.clear()
    }

    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //   User defined functions
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤

    protected onUpdate?(): void
    protected onRescale?(): void
    protected onRestyle?(): void
    protected onResize?(): void

    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //     Element handling
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤

    registerElement(elem: Element) {
        this.eventTargetMap.set(elem.DOMElement, elem)
    }

    unregisterElement(elem: Element) {
        this.eventTargetMap.delete(elem.DOMElement)
    }

    requestUpdate(obj: Updateable) {
        this.updateRequests.add(obj)
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