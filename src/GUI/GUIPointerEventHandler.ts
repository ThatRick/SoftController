import { GUIPointerEventHandler } from './GUITypes.js'
import Vec2, {vec2} from './Vector2.js'


export default function CreatePointerEventHandlers(view: GUIPointerEventHandler) {

    view.pointer = {
        isDown:             false,
        isDragging:         false,
        eventTarget:        undefined,
        target:             undefined,
        downTarget:         undefined,

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
        view.pointer.target = (view.getPointerTarget) ? view.getPointerTarget(ev): undefined
        
        view.pointer.downTarget = view.pointer.target

        view.pointer.target && view.pointer.target.onPointerDown && view.pointer.target.onPointerDown(ev, view.pointer)
        view.onPointerDown && view.onPointerDown(ev)

        console.log('pointer down', view.pointer.target)
    }

    // Pointer move
    view.DOMElement.onpointermove = ev => {
        ev.preventDefault()
        view.pointer.pos.set(ev.x, ev.y)
        
        // Only find target GUI Element if Event Target has changed
        if (ev.target != view.pointer.eventTarget) {
            view.pointer.eventTarget = ev.target
            view.pointer.target = (view.getPointerTarget) ? view.getPointerTarget(ev): undefined
        }
        view.pointer.target && view.pointer.target.onPointerMove && view.pointer.target.onPointerMove(ev, view.pointer)
        view.onPointerMove && view.onPointerMove(ev)

        // Check if user is dragging
        if (view.pointer.isDown) {
            view.pointer.dragOffset = Vec2.sub(view.pointer.pos, view.pointer.downPos)
            const pointerIsDragging = view.pointer.isDragging || view.pointer.dragOffset.len() > view.pointer.dragHyst
            const targetIsDragging = pointerIsDragging && view.pointer.downTarget && view.pointer.downTarget.isMovable
            // Drag started
            if (pointerIsDragging && !view.pointer.isDragging) {
                view.pointer.isDragging = true
                if (targetIsDragging) {
                    view.pointer.dragTargetInitPos = view.pointer.downTarget.pos.copy()
                    view.pointer.downTarget.onDragStarted && view.pointer.downTarget.onDragStarted(ev, view.pointer)
                }
                view.onDragStarted && view.onDragStarted(ev)
            }
            // Dragging
            if (view.pointer.isDragging) {
                view.onDragging && view.onDragging(ev)
                if (targetIsDragging) {
                    view.pointer.downTarget.onDragging && view.pointer.downTarget.onDragging(ev, view.pointer)
                    const offset = Vec2.div(view.pointer.dragOffset, view.scale)
                    const newPos = Vec2.add(view.pointer.dragTargetInitPos, offset)
                    view.pointer.downTarget.pos = newPos
                }
            }
        }
    }

    // Pointer up
    view.DOMElement.onpointerup = ev => {
        ev.preventDefault()
        view.pointer.isDown = false
        view.pointer.upPos = vec2(ev.x, ev.y)

        view.pointer.eventTarget = ev.target
        view.pointer.target = (view.getPointerTarget) ? view.getPointerTarget(ev): undefined

        view.onPointerUp && view.onPointerUp(ev)
        if (!view.pointer.isDragging && view.pointer.target && view.pointer.target == view.pointer.downTarget) {
            view.pointer.target && view.pointer.target.onClicked && view.pointer.target.onClicked(ev, view.pointer)
            view.onClicked && view.onClicked(ev)
        }
        if (view.pointer.isDragging) {
            view.pointer.isDragging = false
            view.onDragEnded && view.onDragEnded(ev)
            if (view.pointer.downTarget && view.pointer.downTarget.isMovable) {
                view.pointer.downTarget.onDragEnded && view.pointer.downTarget.onDragEnded(ev, view.pointer)
            }
        }
    }
}