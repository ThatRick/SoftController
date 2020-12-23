import { IGUIContainer, IGUIElement, GUIPointerEventHandler, GUIPointerState, IDOMElement } from './GUITypes.js'
import CreatePointerHandlers from './GUIPointerEventHandler.js'
import Vec2, {vec2} from './Vector2.js'
import GUIContainer from './GUIContainer.js'

const enum MouseButton {
    LEFT =   1,
    RIGHT =  2,
    MIDDLE = 4
}

export default class GUIView implements IDOMElement, GUIPointerEventHandler{

    children = new GUIContainer(this)

    DOMElements = new Map<EventTarget, IGUIElement>()
    updateRequests = new Set<IGUIElement>()
    
    private _scale = Object.freeze(vec2(1, 1))

    set scale(v: Vec2) {
        if (this._scale.equal(v)) return
        this._scale = Object.freeze(v.copy())
        this.update(true)
    }

    get scale() { return this._scale }

    snap = Object.freeze(vec2(32))

    pos = vec2(0, 0)
    absPos = vec2(0, 0)

    get size() {
        const box = this.DOMElement.getBoundingClientRect()
        return vec2(box.width, box.height)
    }

    constructor(
        public DOMElement: HTMLElement,
        style?: Partial<CSSStyleDeclaration>
    ) {
        console.log('GUI Init')

        const defaultStyle: Partial<CSSStyleDeclaration> = {
            width: '100%',
            position: 'relative',
            overflow: 'auto'
        }
 
        Object.assign(this.DOMElement.style, defaultStyle, style)

        CreatePointerHandlers(this)
        
        this.setup()

        this.children.init(this)

        requestAnimationFrame(this.update.bind(this))
    }

    update(force = false) {
        if (force) {
            this.children.update(this, force)
            this.updateRequests.clear()
        }
        else {
            this.updateRequests.forEach(elem => {
                const keep = elem.update(this)
                if (!keep) this.updateRequests.delete(elem)
            })
        }
        this.loop()

        requestAnimationFrame(this.update.bind(this))
    }

    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //   User defined functions
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤

    setup() {}

    loop() {}


    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //     Element handling
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤

    registerElement(elem: IGUIElement) {
        this.DOMElements.set(elem.DOMElement, elem)
    }

    unregisterElement(elem: IGUIElement) {
        this.DOMElements.delete(elem.DOMElement)
    }

    requestElementUpdate(elem: IGUIElement) {
        this.updateRequests.add(elem)
    }

    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //   Pointer events
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤

    getPointerTarget(ev: PointerEvent) {
        return this.DOMElements.get(ev.target)
    }

    scrollStartPos: Vec2
    isScrolling = false

    endScrolling() {
        if (this.isScrolling) {
            this.isScrolling = false
            this.DOMElement.style.cursor = 'default'
        }
    }

    onDragStarted = (ev: PointerEvent) => {
        if (ev.buttons == MouseButton.MIDDLE && ev.target == this.DOMElement) {
            this.scrollStartPos = vec2(this.DOMElement.scrollLeft, this.DOMElement.scrollTop)
            this.isScrolling = true
            this.DOMElement.style.cursor = 'grab'
        }
    }
    onDragging = (ev: PointerEvent) => {
        if (this.isScrolling) {
            this.DOMElement.scrollLeft = this.scrollStartPos.x - this.pointer.dragOffset.x
            this.DOMElement.scrollTop = this.scrollStartPos.y - this.pointer.dragOffset.y
        }
    }
    onDragEnded = (ev: PointerEvent) => {
        this.endScrolling()
    }

    onPointerLeave = (ev: PointerEvent) => {
        this.endScrolling()
    }
    
    pointer: GUIPointerState

    onPointerEnter?: (ev: PointerEvent) => void
    onPointerDown?:  (ev: PointerEvent) => void
    onPointerMove?:  (ev: PointerEvent) => void
    onPointerUp?:    (ev: PointerEvent) => void
    onClicked?:      (ev: PointerEvent) => void


}