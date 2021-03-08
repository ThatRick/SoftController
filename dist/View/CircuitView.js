import { vec2 } from '../Lib/Vector2.js';
import GUIView from '../GUI/GUIView.js';
import * as HTML from '../Lib/HTML.js';
import { defaultStyle } from './Common.js';
import { CircuitBlock } from '../State/FunctionLib.js';
import FunctionBlockView from './FunctionBlockView.js';
import { EventEmitter } from '../Lib/Events.js';
import CircuitSelection from './Selection.js';
import CircuitPointerHandler from './PointerHandler.js';
import TraceLayer from './TraceLayer.js';
import { TraceLine } from './TraceLine.js';
import IOPinView from './IOPinView.js';
export default class CircuitView extends GUIView {
    constructor(parent, size, scale, style = defaultStyle) {
        super(parent, size, scale, style, {
            backgroundColor: style.colors.background,
            ...HTML.backgroundGridStyle(scale, style.colors.gridLines),
            fontFamily: 'system-ui',
            fontSize: Math.round(scale.y * style.fontSize) + 'px'
        });
        this.circuitViewEvents = new EventEmitter(this);
        this.selection = new CircuitSelection(this.style);
        this.blockViewsMap = new WeakMap();
        this.traceLinesMap = new WeakMap();
        this.pointer.attachEventHandler(CircuitPointerHandler(this));
        this.traceLayer = new TraceLayer(this.DOMElement, this.scale, this.style);
    }
    loadCircuitDefinition(circuitViewDefinition) {
        const { definition, positions, size } = circuitViewDefinition;
        this.resize(vec2(size));
        this._circuitBlock = new CircuitBlock(definition);
        // Create block views
        this.circuit.blocks.forEach((block, index) => {
            const pos = positions.blocks[index];
            const blockView = new FunctionBlockView(block, vec2(pos), this.children);
            this.blockViewsMap.set(block, blockView);
        });
        // Create circuit IO pins
        this.createPins(circuitViewDefinition);
        // Create connection lines
        this.circuit.blocks.forEach((destBlock) => {
            destBlock.inputs?.forEach(input => {
                if (input.sourcePin) {
                    const destPin = this.blockViewsMap.get(destBlock)?.getPinForIO(input);
                    const sourceBlock = input.sourcePin.block;
                    const sourcePin = (sourceBlock == this.circuitBlock)
                        ? this.inputPins.find(pin => pin.io == input.sourcePin)
                        : this.blockViewsMap.get(sourceBlock)?.getPinForIO(input.sourcePin);
                    const traceLine = new TraceLine(this, sourcePin, destPin);
                    this.traceLinesMap.set(input, traceLine);
                }
            });
        });
        this.events.emit(0 /* CircuitLoaded */);
    }
    get circuitBlock() { return this._circuitBlock; }
    get blockViews() {
        return this.circuit.blocks.map(block => this.blockViewsMap.get(block));
    }
    createPins(def) {
        this.inputPins ??= this.circuitBlock.inputs.map((input, index) => {
            const posY = def.positions?.inputs?.[index] || index;
            const pin = new IOPinView(input, vec2(0, posY), this.children);
            return pin;
        });
        this.outputPins ??= this.circuitBlock.outputs.map((output, index) => {
            const posY = def.positions?.outputs?.[index] || index;
            const pin = new IOPinView(output, vec2(this.size.x - 1, posY), this.children);
            return pin;
        });
    }
    onResize() {
    }
    onRescale() {
        this.traceLayer.rescale(this.scale);
        this.onRestyle();
    }
    onRestyle() {
        this.setStyle({
            backgroundColor: this.style.colors.background,
            ...HTML.backgroundGridStyle(this.scale, this.style.colors.gridLines),
            fontSize: Math.round(this.scale.y * this.style.fontSize) + 'px'
        });
    }
    get circuit() { return this._circuitBlock?.circuit; }
}
CircuitView.IO_AREA_WIDTH = 5;
