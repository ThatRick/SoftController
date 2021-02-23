import { GUIChildElement } from '../GUI/GUIChildElement.js';
import { vec2 } from '../Lib/Vector2.js';
import { defaultStyle } from './Common.js';
export default class IOPinView extends GUIChildElement {
    constructor(ioPin, pos, parentContainer, style = defaultStyle) {
        super(parentContainer, 'div', pos, vec2(1, 1), {
            backgroundColor: 'red'
        });
        this.ioPin = ioPin;
    }
    get type() { return this.ioPin.type; }
}
