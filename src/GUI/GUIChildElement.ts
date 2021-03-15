import { EventEmitter } from '../Lib/Events.js'
import { vec2 } from '../Lib/Vector2.js'
import GUIContainer from './GUIContainer.js'
import { IChildElementGUI, IContainerGUI, IRootViewGUI, Vec2, EventHandlerFn, IStyleGUI } from './GUITypes.js'

export const enum GUIChildEventType {
    PositionChanged,
    Removed
}

export interface GUIChildEvent {
    type:   GUIChildEventType
    source: IChildElementGUI
}

export class GUIChildElement implements IChildElementGUI
{
    DOMElement: HTMLElement

    parentContainer?: IContainerGUI
    children?: IContainerGUI

    isDraggable?: boolean
    isSelectable?: boolean
    isMultiSelectable?: boolean

    gui: IRootViewGUI

    events = new EventEmitter<GUIChildEvent>(this)

    ////////////////////////////
    //      Constructor
    ////////////////////////////
    constructor(
        parent: IContainerGUI,
        elem:   HTMLElement | 'div',
        pos:    Vec2,
        size?:  Vec2,
        style?: Partial<CSSStyleDeclaration>,
        hasChildren = false
    ) {
        this._pos = vec2(pos)
        this._size = vec2(size)

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
    private _initUpdate = true

    setPos(p: Vec2) {
        if (this._pos.equal(p)) return
        this._pos.set(p)
        this._posHasChanged = true
        this.requestUpdate()
        this.events.emit(GUIChildEventType.PositionChanged)
        this.children?.parentMoved()
    }
    get pos() { return this._pos.copy() }

    // Element absolute position
    get absPos() {
        const absPos = Vec2.add(this._pos, this.parentContainer.absPos)
        return absPos
    }

    // Translate Absolute position to relative position
    pointerScaledPos() {
        return Vec2.sub(this.gui.pointer.scaledPos, this.absPos)
    }
    pointerScreenPos() {
        return Vec2.sub(this.gui.pointer.screenPos, Vec2.mul(this.absPos, this.gui.scale))
    }

    // Size
    protected _size: Vec2
    protected _sizeScaled: Vec2
    protected _sizeHasChanged = false

    setSize(s: Vec2) {
        if (this._size.equal(s)) return
        this._size.set(s)
        this._sizeHasChanged = true
        this.requestUpdate()
    }
    get size() { return this._size?.copy() }

    setStyle(style: Partial<CSSStyleDeclaration>) {
        Object.assign(this.DOMElement.style, style)
    }

    update(forceUpdate?: boolean)
    {
        if (this._posHasChanged || forceUpdate) {
            this._posHasChanged = false;
            this._posScaled = Vec2.mul(this._pos, this.gui.scale)
            this.DOMElement.style.left =    this._posScaled.x + 'px'
            this.DOMElement.style.top =     this._posScaled.y + 'px'
        }
        if (this._size && this._sizeHasChanged || forceUpdate) {
            this._sizeHasChanged = false;
            this._sizeScaled = Vec2.mul(this._size, this.gui.scale)
            this.DOMElement.style.width =   this._sizeScaled.x + 'px'
            this.DOMElement.style.height =  this._sizeScaled.y + 'px'
        }
        if (this._initUpdate) this._initUpdate = false
        else this.onUpdate?.(forceUpdate)

        return false
    }

    rescale(scale: Vec2) {
        this.update(true)
        this.onRescale?.(scale)
        this.children?.rescale(scale)
    }
    restyle(style: IStyleGUI) {
        this.onRestyle?.(style)
        this.children?.restyle(style)
    }
    parentMoved() {
        this.onParentMoved?.()
        this.events.emit(GUIChildEventType.PositionChanged)
        this.children?.parentMoved()
    }

    protected onUpdate?(force?: boolean): void
    protected onRescale?(scale: Vec2): void
    protected onRestyle?(style: IStyleGUI): void
    protected onParentMoved?(): void

    requestUpdate() {
        this.gui.requestUpdate(this)
    }

    delete() {
        this.parentContainer.removeChildElement(this)
        this.children?.delete()
        this.events.emit(GUIChildEventType.Removed)
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