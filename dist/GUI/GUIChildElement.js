import { vec2 } from '../Lib/Vector2.js';
import GUIContainer from './GUIContainer.js';
import { Vec2 } from './GUITypes.js';
export class GUIChildElement {
    ////////////////////////////
    //      Constructor
    ////////////////////////////
    constructor(parent, elem, pos, size, style, hasChildren = false) {
        this._posHasChanged = false;
        this._sizeHasChanged = false;
        this._pos = pos;
        this._size = size;
        if (typeof elem == 'object') {
            this.DOMElement = elem;
        }
        else {
            this.DOMElement = document.createElement(elem);
        }
        const defaultStyle = {
            position: 'absolute'
        };
        Object.assign(this.DOMElement.style, defaultStyle, style);
        this.parentContainer = parent;
        this.parentContainer.attachChildElement(this);
        if (hasChildren)
            this.children = new GUIContainer(this);
        this.update(true);
    }
    setPos(p) {
        if (this._pos.equal(p))
            return;
        this._pos.set(p);
        this._posHasChanged = true;
        this.requestUpdate();
    }
    get pos() { return this._pos.copy(); }
    // Element absolute position
    get absPos() {
        const absPos = Vec2.add(this._pos, this.parentContainer.absPos);
        return absPos;
    }
    // Translate Absolute position to relative position
    relativePixelPos(pos) {
        const bounds = this.DOMElement.getBoundingClientRect();
        return vec2(pos.x - bounds.x, pos.y - bounds.y);
    }
    set size(s) {
        if (this._size.equal(s))
            return;
        this._size.set(s);
        this._sizeHasChanged = true;
        this.requestUpdate();
    }
    get size() { return this._size?.copy(); }
    setStyle(style) {
        Object.assign(this.DOMElement.style, style);
    }
    update(force) {
        if (this._posHasChanged || force) {
            this._posHasChanged = false;
            this._posScaled = Vec2.mul(this._pos, this.gui.scale);
            this.DOMElement.style.left = this._posScaled.x + 'px';
            this.DOMElement.style.top = this._posScaled.y + 'px';
        }
        if (this._size && this._sizeHasChanged || force) {
            this._sizeHasChanged = false;
            this._sizeScaled = Vec2.mul(this._size, this.gui.scale);
            this.DOMElement.style.width = this._sizeScaled.x + 'px';
            this.DOMElement.style.height = this._sizeScaled.y + 'px';
        }
        this.onUpdate?.(force);
        return false;
    }
    rescale(scale) {
        this.update(true);
        this.onRescale?.(scale);
    }
    restyle(style) {
        this.onRestyle?.(style);
    }
    requestUpdate() {
        this.gui.requestElementUpdate(this);
    }
}
