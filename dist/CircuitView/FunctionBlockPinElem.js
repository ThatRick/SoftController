import GUIElement from '../GUI/GUIElement.js';
import Vec2, { vec2 } from '../Lib/Vector2.js';
import { domElement } from '../Lib/HTML.js';
export default class FunctionBlockPinElem extends GUIElement {
    constructor(parent, io, pos) {
        super(parent, 'div', pos, vec2(1, 1));
        this.isSelectable = true;
        this.onPointerEnter = (ev) => {
            this.pin.style.filter = this.gui.style.colorFilterActive;
        };
        this.onPointerLeave = (ev) => {
            this.pin.style.filter = 'none';
        };
        this.io = io;
        this.type = io.pinType;
        this.dataType = this.io.type;
    }
    get id() { return this.io.id; }
    onInit(gui) {
        this.createPinElement(gui);
        this.createValueField(gui);
        this.setColor();
    }
    createPinElement(gui) {
        const size = vec2(0.5, 0.2);
        const yOffset = 0.5 - size.y / 2;
        const scaledOffset = Vec2.mul((this.type == 'input') ? vec2(1 - size.x, yOffset) : vec2(0, yOffset), gui.scale);
        const scaledSize = Vec2.mul(size, gui.scale);
        this.pin = domElement(this.DOMElement, 'div', {
            position: 'absolute',
            left: scaledOffset.x + 'px',
            top: scaledOffset.y + 'px',
            width: scaledSize.x + 'px',
            height: scaledSize.y + 'px',
            pointerEvents: 'none'
        });
    }
    createValueField(gui) {
        const width = (this.dataType == 2 /* BINARY */) ? 1 : 5;
        const height = 0.7;
        const size = vec2(width, height);
        const yOffset = -0.3;
        const xOffset = 0.3;
        const textAlign = (this.dataType == 2 /* BINARY */) ? 'center' : 'left';
        const scaledOffset = Vec2.mul((this.type == 'input') ? vec2(1 - width - xOffset, yOffset) : vec2(xOffset, yOffset), gui.scale);
        const scaledSize = Vec2.mul(size, gui.scale);
        this.valueField = domElement(this.DOMElement, 'div', {
            position: 'absolute',
            left: scaledOffset.x + 'px',
            top: scaledOffset.y + 'px',
            width: scaledSize.x + 'px',
            height: scaledSize.y + 'px',
            lineHeight: scaledSize.y + 'px',
            textAlign,
            backgroundColor: gui.style.pinValueFieldBg,
            pointerEvents: 'none'
        });
        this.valueField.textContent = this.io.value.toString();
    }
    setColor() {
        const style = this.gui.style;
        let color;
        switch (this.dataType) {
            case 2 /* BINARY */:
                color = (this.io.value == 0) ? style.colorPinBinary0 : style.colorPinBinary1;
                break;
            case 1 /* INTEGER */:
                color = style.colorPinInteger;
                break;
            case 0 /* FLOAT */:
                color = style.colorPinFloat;
                break;
        }
        this.pin.style.backgroundColor = color;
        this.valueField.style.color = color;
    }
    setValueColor() {
    }
    selected() {
        this.pin.style.outline = this.gui.style.blockOutlineSelected;
    }
    unselected() {
        this.pin.style.outline = this.gui.style.blockOutlineUnselected;
    }
}
