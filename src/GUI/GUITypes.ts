import GUIView from './GUIView.js'
import Vec2 from './Vector2.js'

export {Vec2}

export interface GUIPointerState
{
    isDown:             boolean
    isDragging:         boolean

    eventTarget:        EventTarget
    targetElem:         IGUIElement
    downTargetElem:     IGUIElement
    
    dragHyst:           number
    dragOffset:         Vec2
    dragTargetInitPos:  Vec2

    pos:                Vec2
    downPos:            Vec2
    upPos:              Vec2  
}


export interface GUIPointerEventHandler extends GUIPointerEventReceiver
{
    DOMElement: HTMLElement
    pointer: GUIPointerState
    scale: Vec2

    getPointerTargetElem?: (ev) => IGUIElement
}


export interface GUIPointerEventReceiver
{
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


export interface IGUIView {
    scale: Vec2
    size: Vec2

    registerElement(elem: IGUIElement)
    unregisterElement(elem: IGUIElement)
    requestElementUpdate(elem: IGUIElement)
}

export interface IDOMElement {
    DOMElement: HTMLElement
    pos: Vec2
    absPos: Vec2
    size?: Vec2
}

export interface IGUIElement extends IDOMElement, GUIPointerEventReceiver
{
    parent?: IGUIContainer
    children?: IGUIContainer

    isMovable: boolean
    init(gui: IGUIView): void
    update(gui: IGUIView, force?: boolean): boolean
}


export interface IGUIContainer extends IDOMElement
{
    elements: Set<IGUIElement>
    attachChildElement(elem: IGUIElement): void
    removeChildElement(elem: IGUIElement): void
    init(gui: IGUIView): void
    update(gui: IGUIView, force?: boolean): boolean
}