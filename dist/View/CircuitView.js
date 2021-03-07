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
        this.blockViews = new Map();
        this.traceLines = new Map();
        this.circuitViewEvents = new EventEmitter(this);
        this.selection = new CircuitSelection(this.style);
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
            this.blockViews.set(block, blockView);
        });
        // Create circuit IO pins
        this.createPins(circuitViewDefinition);
        // Create connection lines
        this.blockViews.forEach(blockView => {
            blockView.block.inputs.forEach(input => {
                if (input.source) {
                    const destPin = blockView.getPinForIO(input);
                    const sourceBlock = input.source.block;
                    let sourcePin;
                    if (sourceBlock == this.circuitBlock) {
                        sourcePin = this.inputPins.find(pin => pin.io == input.source);
                    }
                    else {
                        const blockView = this.blockViews.get(sourceBlock);
                        sourcePin = blockView?.getPinForIO(input.source);
                    }
                    const traceLine = new TraceLine(this.traceLayer, sourcePin, destPin);
                    this.traceLines.set(input, traceLine);
                }
            });
        });
        this.events.emit(0 /* CircuitLoaded */);
    }
    get circuitBlock() { return this._circuitBlock; }
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
