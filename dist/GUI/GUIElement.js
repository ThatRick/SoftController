import Vec2 from './Vector2.js';
export default class GUIElement {
    constructor(_pos, _size, style, container) {
        this._pos = _pos;
        this._size = _size;
        this.style = style;
        this.container = container;
        this.DOMElement = document.createElement('div');
        this.elements = new Set();
        this.unattachedElements = new Set();
        this.isConstantlyUpdated = false;
        this.isDraggable = true;
        this.moveTargetElement = this;
        this._updatedPos = false;
        this._updatedSize = false;
        //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
        //   Pointer events
        //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
        this.pointer = {
            isDown: false,
            isOver: false,
            isDragging: false,
            downPosDOM: undefined,
        };
        if (container)
            container.attachElement(this);
    }
    set pos(p) {
        if (this._pos.equal(p))
            return;
        this._pos.set(p);
        this._updatedPos = true;
        this.requestUpdate();
    }
    get pos() { return this._pos.copy(); }
    set size(s) {
        if (this._size.equal(s))
            return;
        this._size.set(s);
        this._updatedSize = true;
        this.requestUpdate();
    }
    get size() { return this._size.copy(); }
    attached() {
        const pos = Vec2.mul(this._pos, this.gui.scale);
        const size = Vec2.mul(this._size, this.gui.scale);
        const defaultStyle = {
            position: 'absolute',
            left: pos.x + 'px',
            top: pos.y + 'px',
            width: size.x + 'px',
            height: size.y + 'px'
        };
        if (this.style)
            Object.assign(this.DOMElement.style, defaultStyle, this.style);
        this.unattachedElements.forEach(elem => this.attachElement(elem));
        this.unattachedElements.clear();
    }
    requestUpdate() {
        if (this.gui)
            this.gui.requestElementUpdate(this);
    }
    update() {
        if (this._updatedPos) {
            this._updatedPos = false;
            this._domPos = Vec2.mul(this._pos, this.gui.scale);
            this.DOMElement.style.left = this._domPos.x + 'px';
            this.DOMElement.style.top = this._domPos.y + 'px';
        }
        if (this._updatedSize) {
            this._updatedSize = false;
            this._domSize = Vec2.mul(this._size, this.gui.scale);
            this.DOMElement.style.width = this._domSize.x + 'px';
            this.DOMElement.style.height = this._domSize.y + 'px';
        }
        return this.isConstantlyUpdated;
    }
    attachElement(elem) {
        if (!this.gui) {
            this.unattachedElements.add(elem);
            return;
        }
        this.DOMElement.appendChild(elem.DOMElement);
        this.elements.add(elem);
        elem.container = this;
        this.gui.registerElement(elem);
    }
    removeElement(elem) {
        if (!this.gui) {
            this.unattachedElements.delete(elem);
            return;
        }
        this.DOMElement.removeChild(elem.DOMElement);
        this.elements.delete(elem);
        elem.container = undefined;
        this.gui.unregisterElement(elem);
    }
    setupInputHandlers() {
        this.DOMElement.onpointerenter = ev => {
            this.pointer.isOver = true;
            this.onPointerEnter && this.onPointerEnter(ev);
        };
        this.DOMElement.onpointerleave = ev => {
            this.pointer.isOver = false;
            this.onPointerLeave && this.onPointerLeave(ev);
        };
        this.DOMElement.onpointerdown = ev => {
            this.pointer.isDown = true;
            this.onPointerDown && this.onPointerDown(ev);
            this.gui.onPointerDown(this, ev);
        };
        this.DOMElement.onpointermove = ev => {
            this.onPointerMove && this.onPointerMove(ev);
            this.gui.onPointerMove(this, ev);
        };
        this.DOMElement.onpointerup = ev => {
            const wasDown = this.pointer.isDown;
            this.pointer.isDown = false;
            this.onPointerUp && this.onPointerUp(ev);
            if (wasDown) {
                this.onClicked && this.onClicked(ev);
            }
            this.gui.onPointerUp(this, ev);
        };
    }
}
