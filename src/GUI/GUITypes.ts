import GUIView from './GUIView.js'
import Vec2 from '../Lib/Vector2.js'

export {Vec2}

export interface GUIPointerState<T extends IGUIElement>
{
    isDown:             boolean
    isDragging:         boolean

    eventTarget:        EventTarget
    targetElem:         T
    downTargetElem:     T
    
    dragHyst:           number
    dragOffset:         Vec2
    dragTargetInitPos:  Vec2

    pos:                Vec2
    downPos:            Vec2
    upPos:              Vec2  
}

export type EventHandlerFn = (ev: PointerEvent, pointer?: GUIPointerState<IGUIElement>) => void

export interface GUIPointerEventHandler
{
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

export interface IGUIElement extends IDOMElement, GUIPointerEventHandler
{
    parent?: IGUIContainer
    children?: IGUIContainer

    isDraggable?: boolean
    isSelectable?: boolean
    isMultiSelectable?: boolean

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