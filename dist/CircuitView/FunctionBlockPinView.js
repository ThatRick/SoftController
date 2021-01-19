import { GUIChildElement } from '../GUI/GUIChildElement.js';
import Vec2, { vec2 } from '../Lib/Vector2.js';
import { domElement } from '../Lib/HTML.js';
export default class FunctionBlockPinView extends GUIChildElement {
    constructor(parent, io, pos, isInternalCircuitIO = false) {
        super(parent, 'div', pos, vec2(1, 1));
        this.isSelectable = true;
        this.isDraggable = true;
        this.onPointerEnter = (ev) => {
            this.DOMElement.style.filter = this.gui.style.filterActive;
        };
        this.onPointerLeave = (ev) => {
            this.DOMElement.style.filter = 'none';
        };
        this.io = io;
        this.type = (!isInternalCircuitIO && io.pinType == 'inputPin' || isInternalCircuitIO && io.pinType == 'outputPin')
            ? 'inputPin' : 'outputPin';
        this.dataType = this.io.dataType;
        this.isInternalCircuitIO = isInternalCircuitIO;
        this.create(this.gui);
    }
    get id() { return this.io.id; }
    get blockID() {
        return this.io.funcBlock.offlineID;
    }
    create(gui) {
        this.createPinElement(gui);
        this.createValueField(gui);
        this.updatePin();
        this.io.onValueChanged = this.updatePin.bind(this);
    }
    createPinElement(gui) {
        const size = vec2(0.5, gui.style.traceWidth);
        const yOffset = 0.5 - size.y / 2;
        const scaledOffset = Vec2.mul((this.type == 'inputPin') ? vec2(1 - size.x, yOffset) : vec2(0, yOffset), gui.scale);
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
        const scaledOffset = Vec2.mul((this.type == 'inputPin') ? vec2(1 - width - xOffset, yOffset) : vec2(xOffset, yOffset), gui.scale);
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
    }
    updatePin() {
        this.valueField.textContent = this.io.value.toString();
        const style = this.gui.style;
        switch (this.dataType) {
            case 2 /* BINARY */:
                this.color = (this.io.value == 0) ? style.colorPinBinary0 : style.colorPinBinary1;
                break;
            case 1 /* INTEGER */:
                this.color = style.colorPinInteger;
                break;
            case 0 /* FLOAT */:
                this.color = style.colorPinFloat;
                break;
        }
        this.pin.style.backgroundColor = this.color;
        this.valueField.style.color = this.color;
        console.log('update pin:', this.id, this.io.value, this.onPinUpdated);
        this.onPinUpdated?.();
    }
    selected() {
        this.pin.style.outline = this.gui.style.blockOutlineSelected;
        this.pin.style.backgroundColor = this.gui.style.colorSelected;
    }
    unselected() {
        this.pin.style.outline = this.gui.style.blockOutlineUnselected;
        this.updatePin();
    }
}
