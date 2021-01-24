import { GUIChildElement } from '../GUI/GUIChildElement.js';
import Vec2, { vec2 } from '../Lib/Vector2.js';
import { domElement } from '../Lib/HTML.js';
import { getIODataType } from '../Controller/ControllerDataTypes.js';
export default class FunctionBlockPinView extends GUIChildElement {
    constructor(parent, funcState, ioNum, pos, isInternalCircuitIO = false) {
        super(parent, 'div', pos, vec2(1, 1));
        this.isSelectable = true;
        this.isDraggable = true;
        this.onPointerEnter = (ev) => {
            this.DOMElement.style.filter = this.gui.style.filterActive;
        };
        this.onPointerLeave = (ev) => {
            this.DOMElement.style.filter = 'none';
        };
        this.onDoubleClicked = ev => {
            this.toggleValue();
        };
        this.funcState = funcState;
        this.ioNum = ioNum;
        this.pinType = (ioNum < funcState.funcData.inputCount) ? 'inputPin' : 'outputPin';
        this.type = (!isInternalCircuitIO && this.pinType == 'inputPin' || isInternalCircuitIO && this.pinType == 'outputPin')
            ? 'inputPin' : 'outputPin';
        this.isInternalCircuitIO = isInternalCircuitIO;
        this.create(this.gui);
    }
    get name() { return this._name; }
    get dataType() { return getIODataType(this.flags); }
    get flags() { return this.funcState.funcData.ioFlags[this.ioNum]; }
    get value() { return this.funcState.funcData.ioValues[this.ioNum]; }
    get id() { return this.funcState.offlineID * 1000 + this.ioNum; }
    get blockID() {
        return this.funcState.offlineID;
    }
    get reference() {
        const ref = (this.isInternalCircuitIO)
            ? this.funcState.circuit?.circuitData.outputRefs[this.ioNum - this.funcState.funcData.inputCount]
            : this.funcState.funcData.inputRefs[this.ioNum];
        return ref;
    }
    create(gui) {
        this.createPinElement(gui);
        this.createValueField(gui);
        this.updatePin();
        this.funcState.onIOUpdate[this.ioNum] = this.updatePin.bind(this);
        this.funcState.onValidateValueModification[this.ioNum] = this.validateValueModification.bind(this);
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
            pointerEvents: 'none',
            boxSizing: ''
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
    setValue(value) {
        this.funcState.setIOValue(this.ioNum, value);
        this.updatePin();
        if (this.funcState.onlineID)
            this.pendingValueModification();
    }
    updatePin() {
        this.valueField.textContent = this.value.toString();
        const style = this.gui.style;
        switch (this.dataType) {
            case 2 /* BINARY */:
                this.color = (this.value == 0) ? style.colorPinBinary0 : style.colorPinBinary1;
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
        console.log('update pin:', this.id);
        this.onPinUpdated?.();
    }
    toggleValue() {
        if (this.dataType == 2 /* BINARY */ && !this.reference) {
            this.setValue((this.value) ? 0 : 1);
        }
    }
    pendingValueModification() {
        this.valueField.style.outline = this.gui.style.borderPending;
        this.valueField.style.backgroundColor = this.gui.style.colorPending;
    }
    validateValueModification(successful) {
        this.valueField.style.outline = (successful) ? 'none' : this.gui.style.borderError;
        this.valueField.style.backgroundColor = this.gui.style.pinValueFieldBg;
    }
    onSelected() {
        this.pin.style.outline = this.gui.style.blockOutlineSelected;
        this.pin.style.backgroundColor = this.gui.style.colorSelected;
    }
    onUnselected() {
        this.pin.style.outline = this.gui.style.blockOutlineUnselected;
        this.updatePin();
    }
}
