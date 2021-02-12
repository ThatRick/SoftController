import GUIView from './GUIView.js'
import Vec2 from '../Lib/Vector2.js'

export {Vec2}

export interface GUIPointerState<T extends IChildElementGUI>
{
    isDown:             boolean
    isDragging:         boolean

    eventTarget:        EventTarget
    targetElem:         T
    downTargetElem:     T
    
    dragHyst:           number
    screenDragOffset:   Vec2
    dragTargetInitPos:  Vec2
    
    screenPos:          Vec2
    screenLocalPos:     Vec2
    screenDownPos:      Vec2

    scaledPos:          Vec2
    scaledDragOffset:   Vec2
}

export type EventHandlerFn = (ev: PointerEvent, pointer?: GUIPointerState<IChildElementGUI>) => void

export interface GUIPointerEventHandler
{
    onPointerEnter?:    EventHandlerFn
    onPointerLeave?:    EventHandlerFn
    onPointerDown?:     EventHandlerFn
    onPointerMove?:     EventHandlerFn
    onPointerUp?:       EventHandlerFn
    onClicked?:         EventHandlerFn
    onDoubleClicked?:   EventHandlerFn
    onDragStarted?:     EventHandlerFn
    onDragging?:        EventHandlerFn
    onDragEnded?:       EventHandlerFn
}

export interface IStyleGUI {
    [index: string]: any
}

export interface IElementGUI {
    DOMElement: HTMLElement
    gui: IWindowGUI
    pos: Vec2
    absPos: Vec2
    size?: Vec2

    update(force?: boolean): boolean
    rescale(scale: Vec2)
    restyle(style: IStyleGUI)
    delete(): void
}

export interface IWindowGUI extends IElementGUI {
    scale: Vec2
    style: IStyleGUI
    pointer: GUIPointerState<IChildElementGUI>

    registerElement(elem: IChildElementGUI)
    unregisterElement(elem: IChildElementGUI)
    requestElementUpdate(elem: IChildElementGUI)
}

export interface IChildElementGUI extends IElementGUI, GUIPointerEventHandler
{
    parentContainer?: IViewContainerGUI
    children?: IViewContainerGUI

    isDraggable?: boolean
    isSelectable?: boolean
    isMultiSelectable?: boolean
}

export interface IViewContainerGUI extends IElementGUI
{
    elements: Set<IChildElementGUI>
    attachChildElement(elem: IChildElementGUI): void
    removeChildElement(elem: IChildElementGUI): void
}