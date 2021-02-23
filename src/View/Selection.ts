
import { Style } from './Common.js'
import FunctionBlockView from './FunctionBlockView.js'
import IOPinView from './IOPinView.js'

export default class CircuitSelection
{
    type: 'Block' | 'Pin' | null = null

    blocks = new Set<FunctionBlockView>()
    pin: IOPinView | null

    get isMulti() { return this.blocks.size > 1 }

    has(elem: FunctionBlockView | IOPinView) {
        if (elem instanceof FunctionBlockView) {
            return this.blocks.has(elem)
        } else {
            return (this.pin == elem)
        }   
    }
    set(elem: FunctionBlockView | IOPinView) {
        this.removeAll()
        if (elem instanceof FunctionBlockView) {
            this.selectBlock(elem)
        } else {
            this.selectPin(elem)
        }
    }
    add(block: FunctionBlockView) {
        this.selectBlock(block)
    }
    remove(elem: FunctionBlockView | IOPinView) {
        if (elem instanceof FunctionBlockView) {
            this.unselectBlock(elem)
        } else {
            this.unselectPin()
        }
    }
    removeAll() {
        this.blocks.forEach(block => this.unselectBlock(block))
        if (this.pin) this.unselectPin()
    }

    constructor(protected style: Style) {}


    protected selectBlock(block: FunctionBlockView) {
        block.setStyle({ boxShadow: `0px 0px 0px 1px ${this.style.colors.selection} inset` })
        this.blocks.add(block)
        this.type = 'Block'
    }
    protected unselectBlock(block: FunctionBlockView) {
        block.setStyle({ boxShadow: 'none' })
        this.blocks.delete(block)
        if (this.blocks.size == 0) this.type = null
    }
    protected selectPin(pin: IOPinView) {
        pin.setStyle({ boxShadow: `0px 0px 0px 1px ${this.style.colors.selection} inset` })
        this.pin = pin
        this.type = 'Pin'
    }
    protected unselectPin() {
        this.pin.setStyle({ boxShadow: 'none' })
        this.pin = null
        this.type = null
    }
}