import { GUIPointerEventHandler } from './GUITypes.js'
import Vec2, {vec2} from './Vector2.js'


export default function CreatePointerEventHandlers(view: GUIPointerEventHandler) {

    view.pointer = {
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
        upPos:              vec2(0)
    }

    // Pointer down
    view.DOMElement.onpointerdown = ev => {
        ev.preventDefault()
        view.pointer.isDown = true
        view.pointer.downPos.set(ev.x, ev.y)

        view.pointer.eventTarget = ev.target
        view.pointer.targetElem = view.getPointerTargetElem?.(ev)
        
        view.pointer.downTargetElem = view.pointer.targetElem

        view.pointer.targetElem?.onPointerDown?.(ev, view.pointer)
        view.onPointerDown?.(ev)

        console.log('pointer down', view.pointer.targetElem ?? view.pointer.eventTarget)
    }

    // Pointer move
    view.DOMElement.onpointermove = ev => {
        ev.preventDefault()
        view.pointer.pos.set(ev.x, ev.y)
        
        // Only find target GUI Element if Event Target has changed
        if (ev.target != view.pointer.eventTarget) {
            view.pointer.eventTarget = ev.target
            view.pointer.targetElem = view.getPointerTargetElem?.(ev)
        }
        view.pointer.targetElem?.onPointerMove?.(ev, view.pointer)
        view.onPointerMove?.(ev)

        // Check if user is dragging
        if (view.pointer.isDown) {
            view.pointer.dragOffset = Vec2.sub(view.pointer.pos, view.pointer.downPos)
            const pointerIsDragging = view.pointer.isDragging || view.pointer.dragOffset.len() > view.pointer.dragHyst
            // Drag started
            if (pointerIsDragging && !view.pointer.isDragging) {
                view.pointer.isDragging = true
                view.onDragStarted?.(ev)
            }
            // Dragging
            if (view.pointer.isDragging) {
                view.onDragging?.(ev)
            }
        }
    }

    // Pointer up
    view.DOMElement.onpointerup = ev => {
        ev.preventDefault()
        view.pointer.isDown = false
        view.pointer.upPos = vec2(ev.x, ev.y)

        view.pointer.eventTarget = ev.target
        view.pointer.targetElem = view.getPointerTargetElem?.(ev)

        view.onPointerUp?.(ev)

        // Clicked
        if (!view.pointer.isDragging)  {
            view.onClicked?.(ev)
            if (view.pointer.targetElem == view.pointer.downTargetElem) view.pointer.targetElem?.onClicked?.(ev, view.pointer)
        }
        // Stop dragging
        if (view.pointer.isDragging) {
            view.pointer.isDragging = false
            view.onDragEnded?.(ev)
        }
        view.pointer.downTargetElem = undefined
    }
}