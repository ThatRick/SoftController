import { IViewContainerGUI, IChildElementGUI, GUIPointerState, IElementGUI, IWindowGUI, IStyleGUI } from './GUITypes.js'
import Vec2, {vec2} from '../Lib/Vector2.js'
import GUIContainer from './GUIContainer.js'

interface Updateable {
    update(force?: boolean): boolean
}

export default class GUIView<T extends IChildElementGUI, Style extends IStyleGUI> implements IElementGUI, IWindowGUI { 

    DOMElement: HTMLElement

    gui = this
    children: GUIContainer<T>

    eventTargetMap = new Map<EventTarget, T>()
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

        this.setupPointerHandlers()
        this.setup?.()
                
        requestAnimationFrame(this.update.bind(this))
    }

    update() {
        this.updateRequests.forEach(elem => {
            const keep = elem.update()
            if (!keep) this.updateRequests.delete(elem)
        })

        this.loop?.()

        requestAnimationFrame(this.update.bind(this))

        return false
    }

    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //   User defined functions
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤

    setup?(): void

    loop?(): void


    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //     Element handling
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤

    registerElement(elem: T) {
        this.eventTargetMap.set(elem.DOMElement, elem)
    }

    unregisterElement(elem: T) {
        this.eventTargetMap.delete(elem.DOMElement)
    }

    requestElementUpdate(elem: T) {
        this.updateRequests.add(elem)
    }

    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //   Pointer events
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤

    pointer: GUIPointerState<T> =
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
        downPos:            vec2(0),
        upPos:              vec2(0),
        relativeDownPos:    vec2(0)
    }

    getPointerTargetElem(ev: PointerEvent) {
        return this.eventTargetMap.get(ev.target)
    }
    
    onPointerEnter?: (ev: PointerEvent) => void
    onPointerDown?:  (ev: PointerEvent) => void
    onPointerMove?:  (ev: PointerEvent) => void
    onPointerUp?:    (ev: PointerEvent) => void
    onClicked?:      (ev: PointerEvent) => void
    onDragStarted?:  (ev: PointerEvent) => void
    onDragging?:     (ev: PointerEvent) => void
    onDragEnded?:    (ev: PointerEvent) => void

    setupPointerHandlers() {
    
        // Pointer down
        this.DOMElement.onpointerdown = ev => {
            ev.preventDefault()
            this.pointer.isDown = true
            this.pointer.downPos.set(ev.x, ev.y)
            const elem = ev.target as HTMLElement
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
            ev.preventDefault()
            this.pointer.pos.set(ev.x, ev.y)
            
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
            this.pointer.upPos = vec2(ev.x, ev.y)
    
            this.pointer.eventTarget = ev.target
            this.pointer.targetElem = this.getPointerTargetElem?.(ev)
    
            this.onPointerUp?.(ev)
    
            // Clicked
            if (!this.pointer.isDragging)  {
                this.onClicked?.(ev)
                if (this.pointer.targetElem == this.pointer.downTargetElem) this.pointer.targetElem?.onClicked?.(ev, this.pointer)
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