import { vec2 } from '../Lib/Vector2.js'
import GUIContainer from './GUIContainer.js'
import { IChildElementGUI, IViewContainerGUI, IWindowGUI, GUIPointerState, Vec2, EventHandlerFn, IStyleGUI } from './GUITypes.js'

export class GUIChildElement implements IChildElementGUI{
    DOMElement: HTMLElement

    parentContainer?: IViewContainerGUI
    children?: IViewContainerGUI

    isDraggable?: boolean
    isSelectable?: boolean
    isMultiSelectable?: boolean

    gui: IWindowGUI

    ////////////////////////////
    //      Constructor
    ////////////////////////////
    constructor(
        parent: IViewContainerGUI,
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
        Object.assign(this.DOMElement.style, defaultStyle, style)
        
        
        this.parentContainer = parent
        this.parentContainer.attachChildElement(this)
        
        if (hasChildren) this.children = new GUIContainer(this)
        
        this.update(true)
    }



    // Position
    protected _pos: Vec2
    protected _posScaled: Vec2
    protected _posHasChanged = false

    setPos(p: Vec2) {
        if (this._pos.equal(p)) return
        this._pos.set(p)
        this._posHasChanged = true
        this.requestUpdate()
    }
    get pos() { return this._pos.copy() }

    // Element absolute position
    get absPos() {
        const absPos = Vec2.add(this._pos, this.parentContainer.absPos)
        return absPos
    }

    // Translate Absolute position to relative position
    relativePixelPos(pos: Vec2) {
        const bounds = this.DOMElement.getBoundingClientRect();
        return vec2(pos.x - bounds.x, pos.y - bounds.y)
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

    setStyle(style: Partial<CSSStyleDeclaration>) {
        Object.assign(this.DOMElement.style, style)
    }

    update(force?: boolean)
    {
        if (this._posHasChanged || force) {
            this._posHasChanged = false;
            this._posScaled = Vec2.mul(this._pos, this.gui.scale)
            this.DOMElement.style.left =    this._posScaled.x + 'px'
            this.DOMElement.style.top =     this._posScaled.y + 'px'
        }
        if (this._size && this._sizeHasChanged || force) {
            this._sizeHasChanged = false;
            this._sizeScaled = Vec2.mul(this._size, this.gui.scale)
            this.DOMElement.style.width =   this._sizeScaled.x + 'px'
            this.DOMElement.style.height =  this._sizeScaled.y + 'px'
        }
        this.onUpdate?.(force)
        return false
    }

    rescale(scale: Vec2) {
        this.update(true)
        this.onRescale?.(scale)
    }
    restyle(style: IStyleGUI) {
        this.onRestyle?.(style)
    }

    onUpdate?(force?: boolean): void
    onRescale?(scale: Vec2): void
    onRestyle?(style: IStyleGUI): void

    requestUpdate() {
        this.gui.requestElementUpdate(this)
    }

    // Event receivers
    onPointerEnter?: EventHandlerFn
    onPointerLeave?: EventHandlerFn
    onPointerDown?:  EventHandlerFn
    onPointerMove?:  EventHandlerFn
    onPointerUp?:    EventHandlerFn
    onClicked?:      EventHandlerFn
    onDragStarted?:  EventHandlerFn
    onDragging?:     EventHandlerFn
    onDragEnded?:    EventHandlerFn
}