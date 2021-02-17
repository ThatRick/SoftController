import Vec2, { vec2 } from '../Lib/Vector2.js';
import GUIView from '../GUI/GUIView.js';
import CircuitGrid from './CircuitGrid.js';
import FunctionBlockView from './FunctionBlockView.js';
import * as HTML from '../Lib/HTML.js';
import { GUIChildElement } from '../GUI/GUIChildElement.js';
import TraceLayerBezier from './TraceLayerBezier.js';
import { CircuitTrace } from './CircuitTrace.js';
import CircuitPointerHandler from './CircuitPointerHandler.js';
import IOArea from './CircuitIOArea.js';
const debugLogging = false;
function logInfo(...args) { debugLogging && console.info('Circuit View:', ...args); }
function logError(...args) { console.error('Circuit View:', ...args); }
/////////////////////////////
//    Circuit Block Area
/////////////////////////////
class BlockArea extends GUIChildElement {
    constructor(view) {
        super(view.children, 'div', vec2(view.style.IOAreaWidth, 0), Vec2.sub(view.size, vec2(view.style.IOAreaWidth * 2, 0)), {}, true);
    }
}
/////////////////////////////
//      Circuit View
/////////////////////////////
export default class CircuitView extends GUIView {
    constructor(parent, size, scale, style) {
        super(parent, Vec2.add(size, vec2(style.IOAreaWidth * 2, 0)), scale, style, {
            backgroundColor: style.colorBackground,
            ...HTML.backgroundGridStyle(scale, style.colorGridLine),
            fontFamily: 'system-ui',
            fontSize: Math.round(scale.y * style.fontSize) + 'px'
        });
        this.gridMap = new CircuitGrid();
        this.connectingTraceID = -1;
        this.selectedElements = new Set();
        this.selectedElementsInitPos = new WeakMap();
        this.blocks = new Map();
        this.traces = new Map();
        parent.style.backgroundColor = style.colorBackground;
        this.traceLayer = new TraceLayerBezier(this.DOMElement, this.scale, this.gui.style);
        this.blockArea = new BlockArea(this);
        this.inputArea = new IOArea(this, 'inputArea');
        this.outputArea = new IOArea(this, 'outputArea');
        window.onkeydown = this.onKeyDown.bind(this);
        window.onkeyup = this.onKeyUp.bind(this);
        this.pointer.attachEventHandler(CircuitPointerHandler(this));
    }
    loadCircuit(circuit) {
        console.log('CircuitView: Load circuit');
        this.circuit = circuit;
        const margin = vec2(6, 2);
        const area = vec2(16, 8);
        const w = (this.size.x - margin.x * 2);
        // Define circuit IO
        this.inputArea.createCircuitIOViews(circuit);
        this.outputArea.createCircuitIOViews(circuit);
        // Create function block views
        circuit.blocks.forEach((block, i) => {
            const n = i * area.x;
            const row = Math.trunc(n / w);
            const col = n - row * w;
            const y = margin.y + row * area.y;
            const x = margin.x + col;
            this.createFunctionBlockView(block, vec2(x, y));
        });
        // Create connection traces
        this.blocks.forEach(funcBlockElem => {
            funcBlockElem.inputPins.forEach(inputPin => {
                if (inputPin.source) {
                    const outputPin = this.getSourcePin(inputPin.source);
                    const trace = this.createConnectionTrace(outputPin, inputPin);
                    trace.validate();
                }
            });
        });
    }
    createFunctionBlockView(funcBlock, pos) {
        const block = new FunctionBlockView(this.blockArea.children, pos, funcBlock);
        this.blocks.set(funcBlock.id, block);
        return block;
    }
    deleteFunctionBlock(block) {
        this.traces.forEach(trace => trace.isConnectedTo(block) && this.disconnect(trace.inputPin));
        this.circuit.deleteFunctionBlock(block.id);
        this.blocks.delete(block.id);
        block.delete();
    }
    connect(outputPin, inputPin, inverted = false) {
        logInfo('connect', outputPin.id, inputPin.id);
        if (inputPin.funcState.isCircuit) {
            this.circuit.setOutputRef(inputPin.ioNum, outputPin.funcState.id, outputPin.ioNum);
        }
        else {
            inputPin.funcState.setInputRef(inputPin.ioNum, outputPin.blockID, outputPin.ioNum);
        }
        this.createConnectionTrace(outputPin, inputPin, inverted);
    }
    disconnect(inputPin) {
        logInfo('disconnect', inputPin.id);
        if (inputPin.funcState.isCircuit) {
            this.circuit.setOutputRef(inputPin.ioNum, null, 0);
        }
        else {
            inputPin.funcState.setInputRef(inputPin.ioNum, null, 0);
        }
        this.deleteConnectionTrace(inputPin.id);
    }
    createConnectionTrace(outputPin, inputPin, inverted = false) {
        logInfo('create trace', inputPin.id);
        if (inputPin.source) {
            this.deleteConnectionTrace(inputPin.id);
        }
        const trace = new CircuitTrace(this.traceLayer, outputPin, inputPin);
        this.traces.set(inputPin.id, trace);
        return trace;
    }
    deleteConnectionTrace(id) {
        const trace = this.traces.get(id);
        if (!trace)
            return;
        logInfo('delete trace', id);
        trace.delete();
        this.traces.delete(id);
    }
    // Get connection source pin element
    getSourcePin(conn) {
        let outputPin;
        if (conn.id == -1) {
            outputPin = this.inputArea.ioViews[conn.ioNum].ioPin;
        }
        else {
            const sourceBlockElem = this.blocks.get(conn.id);
            outputPin = sourceBlockElem.outputPins[conn.ioNum - sourceBlockElem.inputPins.length];
        }
        return outputPin;
    }
    // Element info to debug string
    elementToString(elem) {
        if (!elem)
            return 'undefined';
        return `type: ${elem.type}, id: ${elem.id}, pos: ${elem.absPos.toString()}`;
    }
    deleteElement(elem) {
        console.log('Delete element', elem);
        switch (elem.type) {
            case 'inputPin':
                this.disconnect(elem);
                break;
            case 'block':
                this.deleteFunctionBlock(elem);
                break;
        }
    }
    insertBlock(lib, opcode) {
        this.funcPendingPlacement = this.circuit.addFunctionBlock(lib, opcode);
        if (this.pointer.targetElem == this.blockArea) {
        }
    }
    startBlockPlacement() {
        logInfo('Start block placement');
        this.blockInPlacement = this.createFunctionBlockView(this.funcPendingPlacement, this.blockArea.pointerScaledPos());
        this.blockInPlacement.DOMElement.style.pointerEvents = 'none';
        this.funcPendingPlacement = undefined;
    }
    ////////////////////////////
    //      DRAG ELEMENT
    ////////////////////////////
    dragElementStarted(elem) {
        switch (elem.type) {
            case 'circuitInput':
            case 'circuitOutput':
            case 'block':
                this.selectedElementsInitPos.set(elem, elem.pos.copy());
                break;
            case 'inputPin':
            case 'outputPin':
                this.selectedElementsInitPos.set(elem, elem.pos.copy());
                this.traceLayer.addTrace(this.connectingTraceID, elem.absPos, elem.absPos, this.style.colorPinHover);
                break;
        }
    }
    draggingElement(elem, initPos, offset, currentPos) {
        switch (elem.type) {
            case 'circuitInput':
            case 'circuitOutput':
            case 'block': {
                elem.setPos(currentPos);
                this.traces.forEach((trace, id) => (trace.isConnectedTo(elem)) && this.updateRequests.add(trace));
                break;
            }
            case 'inputPin': {
                const absPos = this.pointer.scaledPos.sub(vec2(0.5));
                this.traceLayer.updateTrace(this.connectingTraceID, absPos, elem.absPos);
                break;
            }
            case 'outputPin': {
                const absPos = this.pointer.scaledPos.sub(vec2(0.5));
                this.traceLayer.updateTrace(this.connectingTraceID, elem.absPos, absPos);
                break;
            }
        }
    }
    dragElementEnded(elem, initPos, offset, currentPos) {
        switch (elem.type) {
            case 'circuitInput':
            case 'circuitOutput':
            case 'block': {
                elem.setPos(Vec2.round(elem.pos));
                this.traces.forEach((trace, id) => (trace.isConnectedTo(elem)) && this.updateRequests.add(trace));
                break;
            }
            case 'inputPin': {
                const targetElem = this.pointer.targetElem;
                const inputPin = elem;
                if (targetElem?.type == 'outputPin') {
                    const outputPin = targetElem;
                    this.connect(outputPin, inputPin);
                }
                else if (inputPin.source && targetElem?.type == 'inputPin' && targetElem != inputPin) {
                    const trace = this.traces.get(inputPin.id);
                    this.connect(trace.outputPin, targetElem);
                    this.disconnect(inputPin);
                }
                this.traceLayer.deleteTrace(this.connectingTraceID);
                this.unselectAll();
                break;
            }
            case 'outputPin': {
                const outputPin = elem;
                const targetElem = this.pointer.targetElem;
                if (targetElem?.type == 'inputPin') {
                    const inputPin = targetElem;
                    this.connect(outputPin, inputPin);
                }
                else if (targetElem?.type == 'outputPin' && targetElem != outputPin) {
                    // Move output pin connection
                    const connectedTraces = Array.from(this.traces.values()).filter(trace => trace.outputPin == outputPin);
                    if (connectedTraces.length > 0) {
                        const newSourcePin = targetElem;
                        connectedTraces.forEach(trace => this.connect(newSourcePin, trace.inputPin));
                    }
                }
                this.traceLayer.deleteTrace(this.connectingTraceID);
                this.unselectAll();
                break;
            }
        }
    }
    /////////////////////////
    //      SELECTION
    /////////////////////////
    selectElement(elem) {
        this.selectedElements.add(elem);
        elem.onSelected();
        switch (elem.type) {
            case 'block': {
                this.blocks.forEach(block => block.setInfoVisibility('visible'));
                break;
            }
        }
    }
    unselectElement(elem) {
        this.selectedElements.delete(elem);
        elem.onUnselected();
        switch (elem.type) {
            case 'block': {
                if (this.selectedElements.size == 0)
                    this.blocks.forEach(block => block.setInfoVisibility('hidden'));
                break;
            }
        }
    }
    unselectAll() {
        this.selectedElements.forEach(elem => this.unselectElement(elem));
    }
    ////////////////////////////////
    //      KEYBOARD HANDLING
    ////////////////////////////////
    onKeyDown(ev) {
        switch (ev.code) {
            case 'Delete':
            case 'Backspace':
                {
                    this.selectedElements.forEach(elem => this.deleteElement(elem));
                    this.unselectAll();
                    break;
                }
        }
    }
    onKeyUp(ev) {
        console.log('Key up', ev.code, ev.key);
    }
}
