import FunctionBlockView from './FunctionBlockView.js';
export default class CircuitSelection {
    constructor(style) {
        this.style = style;
        this.type = null;
        this.blocks = new Set();
    }
    get isMulti() { return this.blocks.size > 1; }
    has(elem) {
        if (elem instanceof FunctionBlockView) {
            return this.blocks.has(elem);
        }
        else {
            return (this.pin == elem);
        }
    }
    set(elem) {
        this.removeAll();
        if (elem instanceof FunctionBlockView) {
            this.selectBlock(elem);
        }
        else {
            this.selectPin(elem);
        }
    }
    add(block) {
        this.selectBlock(block);
    }
    remove(elem) {
        if (elem instanceof FunctionBlockView) {
            this.unselectBlock(elem);
        }
        else {
            this.unselectPin();
        }
    }
    removeAll() {
        this.blocks.forEach(block => this.unselectBlock(block));
        if (this.pin)
            this.unselectPin();
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
    selectPin(pin) {
        pin.setStyle({ backgroundColor: this.style.colors.pinSelection });
        this.pin = pin;
        this.type = 'Pin';
    }
    unselectPin() {
        this.pin.setStyle({ backgroundColor: 'transparent' });
        this.pin = null;
        this.type = null;
    }
}
