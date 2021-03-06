import { vec2 } from '../Lib/Vector2.js';
import GUIView from '../GUI/GUIView.js';
import { GUIChildElement } from '../GUI/GUIChildElement.js';
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
import { IOPinEventType } from '../State/IOPin.js';
import CircuitGrid from './CircuitGrid.js';
class CircuitBody extends GUIChildElement {
    constructor(circuitView) {
        super(circuitView.children, 'div', vec2(0, 0), vec2(circuitView.size), {
            cursor: 'auto'
        }, true);
        this.circuitView = circuitView;
        this.onRestyle();
        circuitView.events.subscribe(() => { this.setSize(this.circuitView.size); }, [0 /* Resized */]);
    }
    onRestyle() {
        this.setStyle({
            ...HTML.backgroundGridStyle(this.circuitView.scale, this.circuitView.style.colors.gridLines),
        });
    }
    onRescale() {
        this.onRestyle();
    }
}
export default class CircuitView extends GUIView {
    constructor(parent, size, scale, style = defaultStyle) {
        super(parent, size, scale, style, {
            backgroundColor: style.colors.background,
            fontFamily: 'system-ui',
            fontSize: Math.round(scale.y * style.fontSize) + 'px'
        });
        this.ioEventHandler = (event) => {
            const io = event.source;
            switch (event.type) {
                case IOPinEventType.SourceChanged:
                    // Get containing block view (or this as circuit view)
                    const blockView = (io.block == this.circuitBlock) ? this : this.blockViews.get(io.block);
                    // Get IOPinView
                    const pinView = blockView?.getPinForIO(io);
                    if (!pinView) {
                        console.error('Pin view not found for IO event:', event);
                        return;
                    }
                    const currentTrace = this.traceLines.get(io);
                    // If connection removed
                    if (!io.sourcePin) {
                        currentTrace?.delete();
                    }
                    // If connection made
                    if (io.sourcePin) {
                        if (currentTrace && (currentTrace.sourcePinView.io != io.sourcePin))
                            currentTrace.delete();
                        this.createConnectionTrace(io);
                    }
                    this.requestUpdate(this.grid);
                    break;
                case IOPinEventType.Removed:
                    if (io.sourcePin) {
                        const trace = this.traceLines.get(io);
                        trace.delete();
                        this.traceLines.delete(io);
                    }
                    this.requestUpdate(this.grid);
                    break;
            }
        };
        this.functionBlockEventHandler = (event) => {
            switch (event.type) {
                case 3 /* InputAdded */:
                    const newInput = event.source.inputs[event.source.inputs.length - 1];
                    newInput.events.subscribe(this.ioEventHandler, [IOPinEventType.SourceChanged]);
                    break;
                case 2 /* Removed */:
                    this.blockViews.delete(event.source);
                    this.requestUpdate(this.grid);
                    console.log('block removed event received');
                    break;
            }
        };
        this.circuitViewEvents = new EventEmitter(this);
        this.selection = new CircuitSelection(this.style);
        this.blockViews = new Map();
        this.traceLines = new Map();
        this.grid = new CircuitGrid(this);
        this.body = new CircuitBody(this);
        this.traceLayer = new TraceLayer(this.DOMElement, this.scale, this.style);
        this.pointer.attachEventHandler(CircuitPointerHandler(this));
    }
    loadCircuitDefinition(circuitViewDefinition) {
        const { definition, positions, size } = circuitViewDefinition;
        this.resize(vec2(size));
        this._circuitBlock = new CircuitBlock(definition);
        // Create block views
        this.circuit.blocks.forEach((block, index) => {
            const pos = positions.blocks[index];
            this.createFunctionBlockView(block, vec2(pos));
        });
        // Create circuit IO pins
        this.createCircuitPinViews(circuitViewDefinition);
        // Create connection lines
        this.circuit.blocks.forEach((destBlock) => {
            destBlock.inputs?.forEach(destIO => {
                if (destIO.sourcePin)
                    this.createConnectionTrace(destIO);
            });
        });
        this.events.emit(0 /* CircuitLoaded */);
    }
    getPinForIO(io) {
        let foundPin;
        foundPin = this.inputPins.find(pin => pin.io == io);
        foundPin ??= this.outputPins.find(pin => pin.io == io);
        return foundPin;
    }
    get circuitBlock() { return this._circuitBlock; }
    createFunctionBlockView(block, pos) {
        const blockView = new FunctionBlockView(block, pos, this.body.children);
        // subscribe for io connection events
        block.inputs.forEach(input => input.events.subscribe(this.ioEventHandler, [IOPinEventType.SourceChanged]));
        block.events.subscribe(this.functionBlockEventHandler, [3 /* InputAdded */, 2 /* Removed */]);
        this.blockViews.set(block, blockView);
        this.requestUpdate(this.grid);
        return blockView;
    }
    createConnectionTrace(destIO) {
        if (destIO.sourcePin) {
            const destBlock = destIO.block;
            const destPin = (destBlock == this.circuitBlock)
                ? this.getPinForIO(destIO)
                : this.blockViews.get(destBlock)?.getPinForIO(destIO);
            const sourceBlock = destIO.sourcePin.block;
            const sourcePin = (sourceBlock == this.circuitBlock)
                ? this.getPinForIO(destIO.sourcePin)
                : this.blockViews.get(sourceBlock)?.getPinForIO(destIO.sourcePin);
            if (destPin && sourcePin) {
                const traceLine = new TraceLine(this, sourcePin, destPin);
                this.traceLines.set(destIO, traceLine);
                this.requestUpdate(this.grid);
            }
            else if (!destPin)
                console.error('Trace failed. Destination IO pin view not found', destIO);
            else if (!sourcePin)
                console.error('Trace failed. Source IO pin view not found', destIO.sourcePin);
        }
        else
            console.error('Trace failed. Destionation IO has no source', destIO);
    }
    createCircuitPinViews(def) {
        this.inputPins ??= this.circuitBlock.inputs.map((input, index) => {
            const posY = def.positions?.inputs?.[index] || index;
            return this.createCircuitPinView(input, vec2(0, posY));
        });
        this.outputPins ??= this.circuitBlock.outputs.map((output, index) => {
            const posY = def.positions?.outputs?.[index] || index;
            return this.createCircuitPinView(output, vec2(this.body.size.x - 1, posY));
        });
    }
    createCircuitPinView(io, pos) {
        const pin = new IOPinView(io, pos, this.body.children);
        if (pin.direction == 'left')
            io.events.subscribe(this.ioEventHandler.bind(this), [IOPinEventType.SourceChanged]);
        return pin;
    }
    onResize() {
        this.grid.resize();
    }
    onRescale() {
        this.traceLayer.rescale(this.scale);
        this.onRestyle();
    }
    onRestyle() {
        this.setStyle({
            backgroundColor: this.style.colors.background,
            fontSize: Math.round(this.scale.y * this.style.fontSize) + 'px'
        });
    }
    get circuit() { return this._circuitBlock?.circuit; }
}
CircuitView.IO_AREA_WIDTH = 5;
