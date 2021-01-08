import GUIContainer from './GUIContainer.js'
import {IDOMElement, IGUIElement, IGUIContainer, IGUIView, GUIPointerState, Vec2} from './GUITypes.js'

export default class GUIElement implements IGUIElement{
    DOMElement: HTMLElement

    parent?: IGUIContainer
    children?: IGUIContainer

    isMovable: boolean

    protected gui: IGUIView


    ////////////////////////////
    //      Constructor
    ////////////////////////////
    constructor(
        parent: IGUIContainer | undefined,
        elem:   HTMLElement | 'div',
        pos:    Vec2,
        size?:  Vec2,
        style?: Partial<CSSStyleDeclaration>,
        hasChildren = false
    ) {
        this._pos = pos
        this._size = size

        if (typeof elem == 'object') {
            this.DOMElement = elem
        } else {
            this.DOMElement = document.createElement(elem)
        }
        
        const defaultStyle: Partial<CSSStyleDeclaration> = {
            position: 'absolute'
        }
        if (style) Object.assign(this.DOMElement.style, defaultStyle, style)

        this.parent = parent

        if (hasChildren) this.children = new GUIContainer(this)

        if (this.parent) this.parent.attachChildElement(this)
        
    }

    init(gui: IGUIView): void
    {
        this.gui = gui
        if (this.onInit) setTimeout(() => this.onInit(gui))
        console.log('GUIElement init, children:', this.children)
        this.children?.init(gui)
        this.update(gui, true)
    }

    onInit?(gui: IGUIView): void

    update(gui: IGUIView, force?: boolean)
    {
        if (this._posHasChanged || force) {
            this._posHasChanged = false;
            this._posScaled = Vec2.mul(this._pos, gui.scale)
            this.DOMElement.style.left =    this._posScaled.x + 'px'
            this.DOMElement.style.top =     this._posScaled.y + 'px'
        }
        if (this._size && this._sizeHasChanged || force) {
            this._sizeHasChanged = false;
            this._sizeScaled = Vec2.mul(this._size, gui.scale)
            this.DOMElement.style.width =   this._sizeScaled.x + 'px'
            this.DOMElement.style.height =  this._sizeScaled.y + 'px'
        }
        this.onUpdate?.(gui)
        return false
    }

    onUpdate?(gui: IGUIView): void

    requestUpdate() {
        if (this.gui) this.gui.requestElementUpdate(this)
    }

    // Position
    protected _pos: Vec2
    protected _posScaled: Vec2
    protected _posHasChanged = false

    set pos(p: Vec2) {
        if (this._pos.equal(p)) return
        this._pos.set(p)
        this._posHasChanged = true
        this.requestUpdate()
    }
    get pos() { return this._pos.copy() }

    // Absolute position
    get absPos() {
        const absPos = this.pos
        this.parent && absPos.add(this.parent.pos)
        return absPos
    }

    // Size
    protected _size: Vec2
    protected _sizeScaled: Vec2
    protected _sizeHasChanged = false

    set size(s: Vec2) {
        if (this._size.equal(s)) return
        this._size.set(s)
        this._sizeHasChanged = true
        this.requestUpdate()
    }
    get size() { return this._size?.copy() }

    // Event receivers
    onPointerEnter?: (ev: PointerEvent, pointer?: GUIPointerState) => void
    onPointerLeave?: (ev: PointerEvent, pointer?: GUIPointerState) => void
    onPointerDown?:  (ev: PointerEvent, pointer?: GUIPointerState) => void
    onPointerMove?:  (ev: PointerEvent, pointer?: GUIPointerState) => void
    onPointerUp?:    (ev: PointerEvent, pointer?: GUIPointerState) => void
    onClicked?:      (ev: PointerEvent, pointer?: GUIPointerState) => void
    onDragStarted?:  (ev: PointerEvent, pointer?: GUIPointerState) => void
    onDragging?:     (ev: PointerEvent, pointer?: GUIPointerState) => void
    onDragEnded?:    (ev: PointerEvent, pointer?: GUIPointerState) => void
}