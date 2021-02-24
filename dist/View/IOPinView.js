import { GUIChildElement } from '../GUI/GUIChildElement.js';
import Vec2, { vec2 } from '../Lib/Vector2.js';
import { IOPinEventType } from '../State/IOPin.js';
import * as HTML from '../Lib/HTML.js';
export default class IOPinView extends GUIChildElement {
    //////////////////////////////////////////////
    //              Constructor
    //////////////////////////////////////////////
    constructor(io, pos, parentContainer) {
        super(parentContainer, 'div', pos, vec2(1, 1));
        this.io = io;
        io.events.subscribe(this.ioEventHandler.bind(this));
        this.create();
    }
    get type() { return this.io.type; }
    //////////////////////////////////////////////
    //               Protected
    //////////////////////////////////////////////
    ioEventHandler(ev) {
        switch (ev.type) {
            case IOPinEventType.Value:
                break;
            case IOPinEventType.Source:
                break;
            case IOPinEventType.Inverted:
                this.updateStyle();
                break;
            case IOPinEventType.Removed:
                this.delete();
                break;
            default:
                console.error('FunctionBlockView: Unhandled block event!');
        }
    }
    onRescale() {
        this.updateStyle();
    }
    updateStyle() {
        const pinStyle = (this.io.inverted) ? this.invertedPinStyle : this.pinStyle;
        Object.assign(this.pin.style, pinStyle);
    }
    create() {
        const pinStyle = (this.io.inverted) ? this.invertedPinStyle : this.pinStyle;
        this.pin = HTML.domElement(this.DOMElement, 'div', pinStyle);
        this.updatePinColor();
    }
    updatePinColor() {
        const style = this.gui.style;
        let color;
        switch (this.io.datatype) {
            case 'BINARY':
                color = style.colors.binaryOff;
                break; // (this.io.value == 0) ? style.colors.binaryOff : style.colors.binaryOn; break
            case 'INTEGER':
                color = style.colors.integer;
                break;
            case 'FLOAT':
                color = style.colors.float;
                break;
        }
        (this.io.inverted)
            ? this.pin.style.borderColor = color
            : this.pin.style.backgroundColor = color;
        // this.valueField.style.color = this.color
    }
    get pinStyle() {
        const size = vec2(0.5, this.gui.style.traceWidth);
        const scaledSize = Vec2.mul(size, this.gui.scale).round();
        const scaledYOffset = Math.round(this.gui.scale.y / 2 - scaledSize.y / 2);
        const scaledOffset = (this.type == 'input')
            ? vec2(this.gui.scale.x - scaledSize.x, scaledYOffset)
            : vec2(0, scaledYOffset);
        return {
            position: 'absolute',
            left: scaledOffset.x + 'px',
            top: scaledOffset.y + 'px',
            width: scaledSize.x + 'px',
            height: scaledSize.y + 'px',
            border: 'none',
            borderRadius: '0',
            pointerEvents: 'none',
        };
    }
    get invertedPinStyle() {
        const scale = this.gui.scale;
        const scaledSize = vec2(scale.x * 0.6).round();
        const yOffset = (scale.y - scaledSize.y) / 2;
        const scaledOffset = (this.type == 'input') ? vec2(scale.x - scaledSize.x, yOffset) : vec2(0, yOffset);
        return {
            position: 'absolute',
            left: scaledOffset.x + 'px',
            top: scaledOffset.y + 'px',
            width: scaledSize.x + 'px',
            height: scaledSize.y + 'px',
            borderStyle: 'solid',
            borderWidth: this.gui.style.traceWidth * scale.y + 'px',
            borderRadius: (scaledSize.x / 2) + 'px',
            backgroundColor: 'transparent',
            pointerEvents: 'none',
            boxSizing: 'border-box'
        };
    }
}
