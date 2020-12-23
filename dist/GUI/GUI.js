import Vec2, { vec2 } from './Vector2.js';
export default class GUI {
    constructor(parentElementID, style) {
        this.parentElementID = parentElementID;
        this.style = style;
        this.elements = new Set();
        this.unattachedElements = new Set();
        this.updateRequests = new Set();
        //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
        //   Pointer events
        //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
        this.pointer = {
            isDown: false,
            isDragging: false,
            downTarget: undefined,
            moveTargetPos: undefined,
            dragHyst: 5,
            dragOffset: undefined,
            pos: undefined,
            downPos: undefined,
            upPos: undefined,
        };
        this.init();
    }
    init() {
        console.log('GUI Init');
        this.root = (this.parentElementID) ? document.getElementById(this.parentElementID) : document.body;
        this.DOMElement = document.createElement('div');
        const defaultStyle = {
            width: '100%',
            height: '100%'
        };
        Object.assign(this.DOMElement.style, defaultStyle, this.style);
        this.root.appendChild(this.DOMElement);
        this.unattachedElements.forEach(elem => this.attachElement(elem));
        this.unattachedElements.clear();
        this.setup();
        requestAnimationFrame(this.update.bind(this));
    }
    update() {
        this.updateRequests.forEach(elem => {
            const keep = elem.update();
            if (!keep)
                this.updateRequests.delete(elem);
        });
        this.loop();
        requestAnimationFrame(this.update.bind(this));
    }
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //   User defined functions
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    setup() { }
    loop() { }
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    //     Element handling
    //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
    attachElement(elem) {
        if (!this.root) {
            this.unattachedElements.add(elem);
            return;
        }
        this.DOMElement.appendChild(elem.DOMElement);
        this.elements.add(elem);
        elem.container = this;
        this.registerElement(elem);
    }
    removeElement(elem) {
        this.DOMElement.removeChild(elem.DOMElement);
        this.elements.delete(elem);
        elem.container = undefined;
        this.unregisterElement(elem);
    }
    registerElement(elem) {
        elem.gui = this;
        elem.attached();
    }
    unregisterElement(elem) {
    }
    requestElementUpdate(elem) {
        this.updateRequests.add(elem);
    }
    onPointerDown(elem, ev) {
        this.pointer.isDown = true;
        this.pointer.downPos = vec2(ev.x, ev.y);
        this.pointer.downTarget = elem;
        this.pointer.moveTargetPos = elem.moveTargetElement && elem.moveTargetElement.pos.copy();
    }
    onPointerMove(elem, ev) {
        this.pointer.pos = vec2(ev.x, ev.y);
        if (this.pointer.isDown) {
            this.pointer.dragOffset = Vec2.sub(this.pointer.pos, this.pointer.downPos);
            this.pointer.isDragging = this.pointer.isDragging || (this.pointer.downTarget.isDraggable && (Vec2.len(this.pointer.dragOffset) > this.pointer.dragHyst));
            if (this.pointer.isDragging) {
                const newPos = Vec2.add(this.pointer.moveTargetPos, this.pointer.dragOffset);
                // Move target element
                this.pointer.downTarget.moveTargetElement.pos = newPos;
            }
        }
    }
    onPointerUp(elem, ev) {
        this.pointer.isDown = false;
        this.pointer.upPos = vec2(ev.x, ev.y);
        if (this.pointer.isDragging) {
            this.pointer.isDragging = false;
            // Drag ended action
            const newPos = Vec2.add(this.pointer.moveTargetPos, this.pointer.dragOffset);
            this.pointer.downTarget.moveTargetElement.pos = newPos;
        }
    }
}
