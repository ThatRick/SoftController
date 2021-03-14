
import { IOPin } from '../State/IOPin.js'
import { Style } from './Common.js'
import FunctionBlockView from './FunctionBlockView.js'
import IOPinView from './IOPinView.js'
import { TraceAnchorHandle } from './TraceLine.js'

export default class CircuitSelection
{
    type: 'Block' | 'Pin' | 'Anchor' | null = null

    blocks = new Set<FunctionBlockView>()
    pin: IOPinView | null
    anchor: TraceAnchorHandle | null

    get isMulti() { return this.blocks.size > 1 }

    has(elem: FunctionBlockView | IOPinView | TraceAnchorHandle) {
        if (elem instanceof FunctionBlockView) {
            return this.blocks.has(elem)
        } else if (elem instanceof IOPinView) {
            return (this.pin == elem)
        } else if (elem instanceof TraceAnchorHandle) {
            return (this.anchor == elem)
        }
    }
    set(elem: FunctionBlockView | IOPinView | TraceAnchorHandle) {
        this.removeAll()
        if (elem instanceof FunctionBlockView) {
            this.selectBlock(elem)
        } else if (elem instanceof IOPinView) {
            this.selectPin(elem)
        } else if (elem instanceof TraceAnchorHandle) {
            this.selectAnchor(elem)
        }
    }
    add(block: FunctionBlockView) {
        this.selectBlock(block)
    }
    remove(elem: FunctionBlockView | IOPinView | TraceAnchorHandle) {
        if (elem instanceof FunctionBlockView) {
            this.unselectBlock(elem)
        } else if (elem instanceof IOPinView) {
            this.unselectPin()
        } else if (elem instanceof TraceAnchorHandle) {
            this.unselectAnchor()
        }
    }
    removeAll() {
        this.blocks.forEach(block => this.unselectBlock(block))
        if (this.pin) this.unselectPin()
        if (this.anchor) this.unselectAnchor()
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
        pin.backgroundColor = this.style.colors.pinSelection
        this.pin = pin
        this.type = 'Pin'
    }
    protected unselectPin() {
        this.pin.backgroundColor = 'transparent'
        this.pin = null
        this.type = null
    }
    protected selectAnchor(anchor: TraceAnchorHandle) {
        this.anchor = anchor
        this.type = 'Anchor'
    }
    protected unselectAnchor() {
        this.anchor.traceLine.onUnselected()
        this.anchor = null
        this.type = null

    }
}