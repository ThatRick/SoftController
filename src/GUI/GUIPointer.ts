import Vec2, { vec2 } from '../lib/Vector2.js'
import { GUIChildElement } from './GUIChildElement.js'
import { GUIPointerEventHandler, IChildElementGUI } from './GUITypes.js'
import GUIView from './GUIView.js'
import * as HTML from './../Lib/HTML.js'

const DOUBLE_CLICK_INTERVAL = 400


export default class GUIPointer<Element extends IChildElementGUI, Style>
{
    isDown =            false
    isDragging =        false
    
    eventTarget:        EventTarget
    targetElem:         Element
    downTargetElem:     Element

    screenPos =         vec2(0)
    screenDownPos =     vec2(0)
    screenDragOffset =  vec2(0)
    
    scaledPos =         vec2(0)
    scaledDownPos =     vec2(0)
    scaledDragOffset =  vec2(0)

    dragTargetInitPos = vec2(0)

    update() {
        if (this.latestMovementEvent) {
            this.updatePointerPosition(this.latestMovementEvent)
            this.latestMovementEvent = null
        }
    }

    attachEventHandler(handler: GUIPointerEventHandler) {
        this.eventHandler = handler
        this.setupEventListeners()
    }
    
    constructor(protected view: GUIView<Element, Style>, eventHandler?: GUIPointerEventHandler)
    {
        console.log('construct GUIPointer', eventHandler)
        this.eventHandler = eventHandler || view
        const bounds = view.DOMElement.getBoundingClientRect();
        this.viewOffset = vec2(bounds.x, bounds.y)
        this.scrollOffset = vec2(view.parentDOM.scrollLeft, view.parentDOM.scrollTop)

        this.setupEventListeners()

        this.markers = {
            dot: new GUIChildElement(this.view.children, 'div', vec2(2,2), vec2(1, 1 * (this.view.scale.x / this.view.scale.y)), {
                borderRadius: this.view.scale.x / 2 + 'px', backgroundColor: 'rgba(192,192,255,0.25)', pointerEvents: 'none'
            }),
            coords: new HTML.Text('coordinates: 123, 123', {
                parent: this.view.DOMElement,
                style: { left: '300px', top: '2px', color: 'white', position: 'fixed' }
            })
        }
    }

    protected markers: {
        dot: GUIChildElement
        coords: HTML.Text
    }
    protected eventHandler: GUIPointerEventHandler
    protected latestMovementEvent: PointerEvent
    protected viewOffset: Vec2
    protected scrollOffset: Vec2

    protected screenLocalPos =    vec2(0)
    protected dragHyst =          2
    protected doubleClickPending = false

    protected updatePointerPosition(ev: PointerEvent)
    {
        const view = this.view
        const handler = this.eventHandler

        this.scrollOffset = vec2(view.parentDOM.scrollLeft, view.parentDOM.scrollTop)
        const x = (ev.x - this.viewOffset.x + this.scrollOffset.x)
        const y = (ev.y - this.viewOffset.y + this.scrollOffset.y)
        this.screenPos.set(x, y).round()
        this.scaledPos.set(x, y).div(view.scale) 
        this.screenLocalPos.set(ev.offsetX, ev.offsetY).round()

        // Only find target GUI Element if Event Target has changed
        if (ev.target != this.eventTarget) {
            this.eventTarget = ev.target
            this.targetElem?.onPointerLeave?.(ev, this)
            this.targetElem = this.getPointerTargetElem?.(ev)
            this.targetElem?.onPointerEnter?.(ev, this)
        }
        this.targetElem?.onPointerMove?.(ev, this)
        handler.onPointerMove?.(ev)

        // Check if user is dragging
        if (this.isDown) {
            this.screenDragOffset.set(this.screenPos).sub(this.screenDownPos)
            this.scaledDragOffset.set(this.screenDragOffset).div(view.scale)
            const pointerIsDragging = this.isDragging || this.screenDragOffset.len() > this.dragHyst
            // Drag started
            if (pointerIsDragging && !this.isDragging) {
                this.isDragging = true
                handler.onDragStarted?.(ev)
            }
            // Dragging
            if (this.isDragging) {
                handler.onDragging?.(ev)
            }
        }

        // Debug marker
        this.markers.dot.setPos(Vec2.sub(this.scaledPos, vec2(0.5)))
        this.markers.coords.setText('coords: ' + Vec2.round(this.scaledPos).toString())
    }

    protected getPointerTargetElem(ev: PointerEvent) {
        return this.view.eventTargetMap.get(ev.target)
    }

    protected setupEventListeners() {
        const view = this.view
        const handler = this.eventHandler

        // Pointer down
        view.DOMElement.onpointerdown = ev => {
            ev.preventDefault()
            this.isDown = true
            this.screenDownPos.set(this.screenPos)
    
            this.eventTarget = ev.target
            this.targetElem = this.getPointerTargetElem?.(ev)
            
            this.downTargetElem = this.targetElem
    
            this.targetElem?.onPointerDown?.(ev, this)
            handler.onPointerDown?.(ev)
        }
    
        // Pointer move
        view.DOMElement.onpointermove = ev => {
            this.latestMovementEvent = ev
        }
    
        // Pointer up
        view.DOMElement.onpointerup = ev => {
            this.isDown = false
    
            this.eventTarget = ev.target
            this.targetElem = this.getPointerTargetElem?.(ev)
    
            handler.onPointerUp?.(ev)
    
            // Clicked
            if (!this.isDragging)  {
                // Double
                if (this.doubleClickPending) {
                    if (this.targetElem == this.downTargetElem) this.targetElem?.onDoubleClicked?.(ev, this)
                    handler.onDoubleClicked?.(ev)
                }
                // Single
                else {
                    if (this.targetElem == this.downTargetElem) this.targetElem?.onClicked?.(ev, this)
                    handler.onClicked?.(ev)
                    this.doubleClickPending = true
                    setTimeout(() => this.doubleClickPending = false, DOUBLE_CLICK_INTERVAL)
                }
            }
            // Stop dragging
            if (this.isDragging) {
                this.isDragging = false
                handler.onDragEnded?.(ev)
            }
            this.downTargetElem = undefined
        }
    }
}