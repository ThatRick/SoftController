import GUIContainer from './GUIContainer.js';
import { Vec2 } from './GUITypes.js';
export default class GUIElement {
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
        if (this.gui)
            this.gui.requestElementUpdate(this);
    }
    set pos(p) {
        if (this._pos.equal(p))
            return;
        this._pos.set(p);
        this._posHasChanged = true;
        this.requestUpdate();
    }
    get pos() { return this._pos.copy(); }
    // Absolute position
    get absPos() {
        const absPos = this.pos;
        this.parentContainer && absPos.add(this.parentContainer.pos);
        return absPos;
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
}
