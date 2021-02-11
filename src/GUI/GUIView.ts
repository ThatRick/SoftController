import { IChildElementGUI, GUIPointerState, IElementGUI, IWindowGUI, IStyleGUI } from './GUITypes.js'
import Vec2, {vec2} from '../Lib/Vector2.js'
import GUIContainer from './GUIContainer.js'
import { GUIChildElement } from './GUIChildElement.js'
import * as HTML from './../Lib/HTML.js'

interface Updateable {
    update(force?: boolean): boolean
}

const DOUBLE_CLICK_INTERVAL = 400

export default class GUIView<Element extends IChildElementGUI, Style extends IStyleGUI> implements IElementGUI, IWindowGUI { 

    DOMElement: HTMLElement

    gui = this
    children: GUIContainer<Element>

    eventTargetMap = new WeakMap<EventTarget, Element>()
    updateRequests = new Set<Updateable>()

    pos = vec2(0, 0)
    absPos = vec2(0, 0)
    
    private _size: Vec2
    set size(v: Vec2) {
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

        const bounds = this.DOMElement.getBoundingClientRect();
        this.offset = vec2(bounds.x, bounds.y)

        this.setupPointerHandlers()
        this.setup?.()
                
        this.markers = {
            pos: new GUIChildElement(this.children, 'div', vec2(2,2), vec2(1, 1 * (this.scale.x / this.scale.y)), {
                borderRadius: this.scale.x / 2 + 'px', backgroundColor: 'red'
            }),
            rel: new GUIChildElement(this.children, 'div', vec2(5,5), vec2(1, 1 * (this.scale.x / this.scale.y)), {
                borderRadius: this.scale.x / 2 + 'px', backgroundColor: 'blue'
            }),
            coords: new HTML.Text('coordinates: 123, 123', { left: '100px', top: '2px', color: 'white', position: 'relative' }, this.DOMElement)
        }

        requestAnimationFrame(this.update.bind(this))
    }

    markers: {
        pos: GUIChildElement
        rel: GUIChildElement
        coords: HTML.Text
    }

    update() {
        if (this.pointerMoved) {
            this.pointerMoved = false
            this.markers.pos.setPos(Vec2.div(this.pointer.pos, this.scale))
            this.markers.rel.setPos(Vec2.div(this.pointer.relativePos, this.scale))
            this.markers.coords.setText('coords: ' + this.pointer.pos.toString() + ', ' + this.pointer.relativePos.toString())
        }

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

    pointer: GUIPointerState<Element> =
    {
        isDown:             false,
        isDragging:         false,
        eventTarget:        undefined,
        targetElem:         undefined,
        downTargetElem:     undefined,

        dragHyst:           2,
        dragOffset:         undefined,
        dragTargetInitPos:  undefined,
    
        pos:                vec2(0),
        relativePos:        vec2(0),
        downPos:            vec2(0),
        relativeDownPos:    vec2(0),
    }
    pointerMoved = false
    offset: Vec2

    getPointerTargetElem(ev: PointerEvent) {
        return this.eventTargetMap.get(ev.target)
    }
    
    onPointerEnter?: (ev: PointerEvent) => void
    onPointerDown?:  (ev: PointerEvent) => void
    onPointerMove?:  (ev: PointerEvent) => void
    onPointerUp?:    (ev: PointerEvent) => void
    onClicked?:      (ev: PointerEvent) => void
    onDoubleClicked?:(ev: PointerEvent) => void
    onDragStarted?:  (ev: PointerEvent) => void
    onDragging?:     (ev: PointerEvent) => void
    onDragEnded?:    (ev: PointerEvent) => void

    doubleClickPending = false

    setupPointerHandlers() {
    
        // Pointer down
        this.DOMElement.onpointerdown = ev => {
            ev.preventDefault()
            this.pointer.isDown = true
            this.pointer.downPos.set(ev.x, ev.y)

            const bounds = this.DOMElement.getBoundingClientRect();
            this.pointer.relativeDownPos.set(ev.x - bounds.x, ev.y - bounds.y)
    
            this.pointer.eventTarget = ev.target
            this.pointer.targetElem = this.getPointerTargetElem?.(ev)
            
            this.pointer.downTargetElem = this.pointer.targetElem
    
            this.pointer.targetElem?.onPointerDown?.(ev, this.pointer)
            this.onPointerDown?.(ev)
        }
    
        // Pointer move
        this.DOMElement.onpointermove = ev => {
            //ev.preventDefault()
            this.pointer.pos.set(ev.x, ev.y).round()
            this.pointer.relativePos.set(ev.offsetX, ev.offsetY).round()

            this.pointerMoved = true
            
            // Only find target GUI Element if Event Target has changed
            if (ev.target != this.pointer.eventTarget) {
                this.pointer.eventTarget = ev.target
                this.pointer.targetElem?.onPointerLeave?.(ev, this.pointer)
                this.pointer.targetElem = this.getPointerTargetElem?.(ev)
                this.pointer.targetElem?.onPointerEnter?.(ev, this.pointer)
            }
            this.pointer.targetElem?.onPointerMove?.(ev, this.pointer)
            this.onPointerMove?.(ev)
    
            // Check if user is dragging
            if (this.pointer.isDown) {
                this.pointer.dragOffset = Vec2.sub(this.pointer.pos, this.pointer.downPos)
                const pointerIsDragging = this.pointer.isDragging || this.pointer.dragOffset.len() > this.pointer.dragHyst
                // Drag started
                if (pointerIsDragging && !this.pointer.isDragging) {
                    this.pointer.isDragging = true
                    this.onDragStarted?.(ev)
                }
                // Dragging
                if (this.pointer.isDragging) {
                    this.onDragging?.(ev)
                }
            }
        }
    
        // Pointer up
        this.DOMElement.onpointerup = ev => {
            ev.preventDefault()
            this.pointer.isDown = false
    
            this.pointer.eventTarget = ev.target
            this.pointer.targetElem = this.getPointerTargetElem?.(ev)
    
            this.onPointerUp?.(ev)
    
            // Clicked
            if (!this.pointer.isDragging)  {
                // Double
                if (this.doubleClickPending) {
                    if (this.pointer.targetElem == this.pointer.downTargetElem) this.pointer.targetElem?.onDoubleClicked?.(ev, this.pointer)
                    this.onDoubleClicked?.(ev)
                }
                // Single
                else {
                    if (this.pointer.targetElem == this.pointer.downTargetElem) this.pointer.targetElem?.onClicked?.(ev, this.pointer)
                    this.onClicked?.(ev)
                    this.doubleClickPending = true
                    setTimeout(() => this.doubleClickPending = false, DOUBLE_CLICK_INTERVAL)
                }
            }
            // Stop dragging
            if (this.pointer.isDragging) {
                this.pointer.isDragging = false
                this.onDragEnded?.(ev)
            }
            this.pointer.downTargetElem = undefined
        }
    }
}