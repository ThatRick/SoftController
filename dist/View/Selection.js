import CircuitIOView from './CircuitIOView.js';
import FunctionBlockView from './FunctionBlockView.js';
import IOPinView from './IOPinView.js';
import { TraceAnchorHandle } from './TraceLine.js';
export default class CircuitSelection {
    constructor(style) {
        this.style = style;
        this.type = null;
        this.blocks = new Set();
    }
    get isMulti() { return this.blocks.size > 1; }
    get singleBlock() { return (this.blocks.size == 1) ? this.blocks.values().next().value : null; }
    has(elem) {
        if (elem instanceof FunctionBlockView) {
            return this.blocks.has(elem);
        }
        else if (elem instanceof CircuitIOView) {
            return (this.circuitIO == elem);
        }
        else if (elem instanceof IOPinView) {
            return (this.pin == elem);
        }
        else if (elem instanceof TraceAnchorHandle) {
            return (this.anchor == elem);
        }
    }
    set(elem) {
        this.unselectAll();
        if (elem instanceof FunctionBlockView) {
            this.selectBlock(elem);
        }
        else if (elem instanceof CircuitIOView) {
            this.selectCircuitIO(elem);
        }
        else if (elem instanceof IOPinView) {
            this.selectPin(elem);
        }
        else if (elem instanceof TraceAnchorHandle) {
            this.selectAnchor(elem);
        }
    }
    add(block) {
        this.selectBlock(block);
    }
    unselect(elem) {
        if (elem instanceof FunctionBlockView) {
            this.unselectBlock(elem);
        }
        else if (elem instanceof CircuitIOView) {
            this.unselectCircuitIO();
        }
        else if (elem instanceof IOPinView) {
            this.unselectPin();
        }
        else if (elem instanceof TraceAnchorHandle) {
            this.unselectAnchor();
        }
    }
    unselectAll() {
        this.blocks.forEach(block => this.unselectBlock(block));
        if (this.pin)
            this.unselectPin();
        if (this.circuitIO)
            this.unselectCircuitIO();
        if (this.anchor)
            this.unselectAnchor();
    }
    selectBlock(block) {
        block.setStyle({ boxShadow: `0px 0px 0px 1px ${this.style.colors.selection} inset` });
        this.blocks.add(block);
        this.type = 'Block';
    }
    unselectBlock(block) {
        block.setStyle({ boxShadow: 'none' });
        this.blocks.delete(block);
        if (this.blocks.size == 0)
            this.type = null;
    }
    selectCircuitIO(ioView) {
        ioView.setStyle({ boxShadow: `0px 0px 0px 1px ${this.style.colors.selection} inset` });
        this.circuitIO = ioView;
        this.type = 'CircuitIO';
    }
    unselectCircuitIO() {
        this.circuitIO.setStyle({ boxShadow: 'none' });
        this.circuitIO = null;
        this.type = null;
    }
    selectPin(pin) {
        pin.backgroundColor = this.style.colors.pinSelection;
        this.pin = pin;
        this.type = 'Pin';
    }
    unselectPin() {
        this.pin.backgroundColor = 'transparent';
        this.pin = null;
        this.type = null;
    }
    selectAnchor(anchor) {
        this.anchor = anchor;
        this.type = 'Anchor';
    }
    unselectAnchor() {
        this.anchor.traceLine.onUnselected();
        this.anchor = null;
        this.type = null;
    }
}
