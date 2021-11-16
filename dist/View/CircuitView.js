import Vec2, { vec2 } from '../Lib/Vector2.js';
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
import { IOPinEventType } from '../State/IOPin.js';
import CircuitGrid from './CircuitGrid.js';
import CircuitIOView from './CircuitIOView.js';
import { exportToFile, generateCircuitViewDefinition } from './CircuitSerializer.js';
class CircuitBody extends GUIChildElement {
    circuitView;
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
export class CircuitIOArea extends GUIChildElement {
    circuitView;
    type;
    constructor(circuitView, type) {
        super(circuitView.children, 'div', vec2(0, 0), vec2(0, 0), {
            cursor: 'auto',
            backgroundColor: circuitView.style.colors.IOAreaBackground
        }, true);
        this.circuitView = circuitView;
        this.type = type;
        circuitView.events.subscribe(this.handleCircuitResize, [0 /* Resized */]);
        this.onRestyle();
        this.handleCircuitResize();
    }
    handleCircuitResize = () => {
        this.setPos((this.type == 'input')
            ? vec2(0, 0)
            : vec2(this.circuitView.size.x - CircuitView.IO_AREA_WIDTH, 0));
        this.setSize(vec2(CircuitView.IO_AREA_WIDTH, this.circuitView.size.y));
    };
    onRestyle() {
        this.setStyle({
            ...HTML.backgroundLinesStyle(this.circuitView.scale, this.circuitView.style.colors.gridLines),
        });
    }
    onRescale() {
        this.onRestyle();
    }
}
class Ticker {
    interval_ms;
    callback;
    timerHandle;
    running = false;
    constructor(interval_ms, callback) {
        this.interval_ms = interval_ms;
        this.callback = callback;
    }
    start() {
        this.timerHandle = setInterval(this.callback, this.interval_ms);
        this.running = true;
    }
    stop() {
        clearInterval(this.timerHandle);
        this.running = false;
    }
    setInterval(interval_ms) {
        this.interval_ms = interval_ms;
        if (this.running) {
            this.stop();
            this.start();
        }
    }
    get isRunning() { return this.running; }
}
export default class CircuitView extends GUIView {
    static IO_AREA_WIDTH = 5;
    save() {
        const circViewDef = generateCircuitViewDefinition(this);
        window.localStorage.setItem(this.name, JSON.stringify(circViewDef));
    }
    open(name) {
        const defString = window.localStorage.getItem(name);
        const def = JSON.parse(defString);
        console.log(defString);
        console.dir(def);
        this.close();
        this.loadCircuitDefinition(def);
    }
    close() {
        this._circuitBlock?.remove();
        this._circuitBlock = null;
        this.blockViews.clear();
        this.inputViews = [];
        this.outputViews = [];
    }
    newCircuit() {
        this.close();
        this._circuitBlock = new CircuitBlock({
            name: 'New circuit',
            inputs: [],
            outputs: [],
            circuit: {
                blocks: [],
                circuitOutputSources: {}
            }
        });
    }
    export() {
        const circViewDef = generateCircuitViewDefinition(this);
        exportToFile(circViewDef, this.name + '.json');
    }
    loadCircuitDefinition(circuitViewDefinition) {
        const { definition, positions, size } = circuitViewDefinition;
        this.resize(vec2(size));
        this._circuitBlock = new CircuitBlock(definition);
        // Create circuit IO views
        this.createCircuitIOViews(circuitViewDefinition);
        // Create function block views
        this.circuit.blocks.forEach((block, index) => {
            const pos = positions.blocks[index];
            const blockView = this.createFunctionBlockView(block, vec2(pos));
            const outputPinOffset = positions.blockOutputPinOffsets?.find(item => item.blockNum == index)?.outputPinOffset;
            if (outputPinOffset)
                blockView.setOutputPinOffset(outputPinOffset);
        });
        // Create connection lines for blocks
        this.circuit.blocks.forEach((destBlock, blockNum) => {
            destBlock.inputs?.forEach((destIO, inputNum) => {
                const anchors = positions.traces?.find(trace => (trace.blockNum == blockNum && trace.inputNum == inputNum))?.anchors;
                console.log('Create trace line for block, io, anchors', blockNum, inputNum, anchors);
                if (destIO.sourceIO)
                    this.createConnectionTrace(destIO, anchors);
            });
        });
        // Create connection lines for circuit outputs
        this.circuitBlock.outputs?.forEach((destIO, index) => {
            const anchors = positions.traces?.find(trace => (trace.blockNum == -1 && trace.inputNum == index))?.anchors;
            if (destIO.sourceIO)
                this.createConnectionTrace(destIO, anchors);
        });
        this.name = definition.name;
        this.circuitViewEvents.emit(0 /* CircuitLoaded */);
        this.insertionIndex = this.circuit.blocks.length;
        this.ticker?.stop();
        this.ticker = new Ticker(100, () => this.circuitBlock.update(100 / 1000));
    }
    functionBlockEventHandler = (event) => {
        const block = event.source;
        switch (event.type) {
            case 3 /* InputAdded */:
                const newInput = block.inputs[block.inputs.length - 1];
                newInput.events.subscribe(this.ioEventHandler, [IOPinEventType.SourceChanged]);
                break;
            case 2 /* Removed */:
                this.blockViews.delete(block);
                this.requestUpdate(this.grid);
                break;
        }
    };
    ioEventHandler = (event) => {
        const io = event.source;
        switch (event.type) {
            case IOPinEventType.SourceChanged:
                // Get containing function block view (or this as circuit view)
                const blockView = (io.block == this.circuitBlock) ? this : this.blockViews.get(io.block);
                // Get IOPinView
                const pinView = blockView?.getPinForIO(io);
                if (!pinView) {
                    console.error('Pin view not found for IO event:', event);
                    return;
                }
                const currentTrace = this.traceLines.get(io);
                // If connection removed
                if (!io.sourceIO) {
                    currentTrace?.delete();
                }
                // If connection made
                if (io.sourceIO) {
                    if (currentTrace && (currentTrace.sourcePinView.io != io.sourceIO))
                        currentTrace.delete();
                    this.createConnectionTrace(io);
                }
                this.requestUpdate(this.grid);
                break;
            case IOPinEventType.Removed:
                if (io.sourceIO) {
                    const trace = this.traceLines.get(io);
                    trace.delete();
                    this.traceLines.delete(io);
                }
                this.requestUpdate(this.grid);
                break;
        }
    };
    getPinForIO(io) {
        let foundPin;
        foundPin = this.inputViews.find(ioView => ioView.pin.io == io)?.pin;
        foundPin ??= this.outputViews.find(ioView => ioView.pin.io == io)?.pin;
        return foundPin;
    }
    addFunctionBlock(name, pos) {
        const block = this.circuit.addBlock({ typeName: name }, this.insertionIndex++);
        this.createFunctionBlockView(block, Vec2.round(pos));
    }
    addCircuitIO(ioType, dataType, name, posY) {
        const io = (ioType == 'input')
            ? this.circuitBlock.addInput(dataType, name)
            : this.circuitBlock.addOutput(dataType, name);
        const ioView = this.createCircuitIOView(io, posY);
        if (io.type == 'input')
            this.inputViews.push(ioView);
        else
            this.outputViews.push(ioView);
    }
    startRuntime() {
        this.ticker.start();
        this.circuitViewEvents.emit(2 /* RuntimeStateChanged */);
    }
    stopRuntime() {
        this.ticker.stop();
        this.circuitViewEvents.emit(2 /* RuntimeStateChanged */);
    }
    circuitViewEvents = new EventEmitter(this);
    body;
    inputArea;
    outputArea;
    grid;
    traceLayer;
    blockViews = new Map();
    traceLines = new Map();
    selection = new CircuitSelection(this.style);
    get circuitBlock() { return this._circuitBlock; }
    get circuit() { return this._circuitBlock?.circuit; }
    ticker;
    insertionIndex = 0;
    inputViews;
    outputViews;
    get name() { return this._name; }
    set name(text) {
        this._name = text;
        this.circuitViewEvents.emit(3 /* NameChanged */);
    }
    constructor(parent, size = vec2(48, 32), scale = vec2(16, 16), style = defaultStyle) {
        super(parent, size, scale, style, {
            backgroundColor: style.colors.background,
            fontFamily: 'system-ui',
            fontSize: Math.round(scale.y * style.fontSize) + 'px'
        });
        this.grid = new CircuitGrid(this);
        this.body = new CircuitBody(this);
        this.inputArea = new CircuitIOArea(this, 'input');
        this.outputArea = new CircuitIOArea(this, 'output');
        this.traceLayer = new TraceLayer(this.DOMElement, this.scale, this.style);
        this.pointer.attachEventHandler(CircuitPointerHandler(this));
    }
    _name = 'New circuit';
    createFunctionBlockView(block, pos) {
        const blockView = new FunctionBlockView(block, pos, this.body.children);
        // subscribe for io connection events
        block.inputs.forEach(input => input.events.subscribe(this.ioEventHandler, [IOPinEventType.SourceChanged]));
        block.events.subscribe(this.functionBlockEventHandler, [3 /* InputAdded */, 2 /* Removed */]);
        this.blockViews.set(block, blockView);
        this.requestUpdate(this.grid);
        return blockView;
    }
    createConnectionTrace(destIO, anchors) {
        if (destIO.sourceIO) {
            const destBlock = destIO.block;
            const destPin = (destBlock == this.circuitBlock)
                ? this.getPinForIO(destIO)
                : this.blockViews.get(destBlock)?.getPinForIO(destIO);
            const sourceBlock = destIO.sourceIO.block;
            const sourcePin = (sourceBlock == this.circuitBlock)
                ? this.getPinForIO(destIO.sourceIO)
                : this.blockViews.get(sourceBlock)?.getPinForIO(destIO.sourceIO);
            if (destPin && sourcePin) {
                const traceLine = new TraceLine(this, sourcePin, destPin, anchors);
                this.traceLines.set(destIO, traceLine);
                this.requestUpdate(this.grid);
            }
            else if (!destPin)
                console.error('Trace failed. Destination IO pin view not found', destIO);
            else if (!sourcePin)
                console.error('Trace failed. Source IO pin view not found', destIO.sourceIO);
        }
        else
            console.error('Trace failed. IO has no source', destIO);
    }
    createCircuitIOViews(def) {
        this.inputViews = this.circuitBlock.inputs.map((input, index) => {
            const posY = def.positions?.inputs?.[index] || index;
            return this.createCircuitIOView(input, posY);
        });
        this.outputViews = this.circuitBlock.outputs.map((output, index) => {
            const posY = def.positions?.outputs?.[index] || index;
            return this.createCircuitIOView(output, posY);
        });
    }
    createCircuitIOView(io, posY) {
        const parentContainer = (io.type == 'input') ? this.inputArea : this.outputArea;
        const ioView = new CircuitIOView(io, posY, parentContainer.children);
        if (ioView.pin.direction == 'left')
            io.events.subscribe(this.ioEventHandler, [IOPinEventType.SourceChanged]);
        return ioView;
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
    _circuitBlock;
}
