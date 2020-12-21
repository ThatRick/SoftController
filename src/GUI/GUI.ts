import { GUIContainer } from './GUITypes.js'
import GUIElement from './GUIElement.js'
import Vec2, {vec2} from './Vector2.js'

interface IGUIPointer
{
    isDown:         boolean
    isDragging:     boolean

    downTarget:     GUIElement
    moveTargetPos: Vec2

    dragHyst:       number
    dragOffset:     Vec2

    pos:            Vec2
    downPos:        Vec2
    upPos:          Vec2  
}


export default class GUI implements GUIContainer {
    
    root: HTMLElement
    DOMElement: HTMLDivElement
    elements = new Set<GUIElement>()
    unattachedElements = new Set<GUIElement>()
    updateRequests = new Set<GUIElement>()

    scale: Vec2

    constructor(
        private parentElementID?: string,
        private style?: Partial<CSSStyleDeclaration>
    ) {
        document.onload = this.init
    }

    init() {
        this.root = (this.parentElementID) ? document.getElementById(this.parentElementID) : document.body

        this.DOMElement = document.createElement('div')
        
        const defaultStyle: Partial<CSSStyleDeclaration> = {
            width: '100%',
            height: '100%'
        }

        Object.assign(this.DOMElement.style, defaultStyle, this.style)
        this.root.appendChild(this.DOMElement)

        this.unattachedElements.forEach(elem => this.attachElement(elem))
        this.unattachedElements.clear()

        this.setup()

        requestAnimationFrame(this.update)
    }

    update() {
        this.updateRequests.forEach(elem => {
            const keep = elem.update()
            if (!keep) this.updateRequests.delete(elem)
        })
        this.loop()
        requestAnimationFrame(this.update)
    }

    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //   User defined functions
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤

    setup() {}

    loop() {}


    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //     Element handling
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤

    attachElement(elem: GUIElement) {
        if (!this.root) {
            this.unattachedElements.add(elem)            
            return
        }
        this.DOMElement.appendChild(elem.DOMElement)
        this.elements.add(elem)
        elem.container = this
        this.registerElement(elem)
    }

    removeElement(elem: GUIElement) {
        this.DOMElement.removeChild(elem.DOMElement)
        this.elements.delete(elem)
        elem.container = undefined
        this.unregisterElement(elem)
    }

    registerElement(elem: GUIElement) {
        elem.gui = this
        elem.attached()
    }

    unregisterElement(elem: GUIElement) {

    }

    requestElementUpdate(elem: GUIElement) {
        this.updateRequests.add(elem)
    }

    
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //   Pointer events
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤

    pointer: IGUIPointer = {
        isDown:         false,
        isDragging:     false,
    
        downTarget:     undefined,
        moveTargetPos:  undefined,
    
        dragHyst:       5,
        dragOffset:     undefined,
    
        pos:            undefined,
        downPos:        undefined,
        upPos:          undefined,  
    }

    onPointerDown(elem: GUIElement, ev: PointerEvent) {
        this.pointer.isDown = true;
        this.pointer.downPos = vec2(ev.x, ev.y);
        this.pointer.downTarget = elem;
        this.pointer.moveTargetPos = elem.moveTargetElement && elem.moveTargetElement.pos.copy();
    }

    onPointerMove(elem: GUIElement, ev: PointerEvent) {
        this.pointer.pos = vec2(ev.x, ev.y)
        if (this.pointer.isDown) {
            this.pointer.dragOffset = Vec2.sub(this.pointer.pos, this.pointer.downPos)
            
            this.pointer.isDragging = this.pointer.isDragging || (this.pointer.downTarget.isDraggable && (Vec2.len(this.pointer.dragOffset) > this.pointer.dragHyst))
            if (this.pointer.isDragging) {
                const newPos = Vec2.add(this.pointer.moveTargetPos, this.pointer.dragOffset)
                // Move target element
                this.pointer.downTarget.moveTargetElement.pos = newPos
            }
        }
    }

    onPointerUp(elem: GUIElement, ev: PointerEvent) {
        this.pointer.isDown = false
        this.pointer.upPos = vec2(ev.x, ev.y)
        if (this.pointer.isDragging) {
            this.pointer.isDragging = false
            // Drag ended action
            const newPos = Vec2.add(this.pointer.moveTargetPos, this.pointer.dragOffset)
            this.pointer.downTarget.moveTargetElement.pos = newPos
        }
    }

}