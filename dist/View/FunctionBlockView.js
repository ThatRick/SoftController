import { vec2 } from '../Lib/Vector2.js';
import { GUIChildElement } from '../GUI/GUIChildElement.js';
import * as HTML from '../Lib/HTML.js';
import IOPinView from './IOPinView.js';
export default class FunctionBlockView extends GUIChildElement {
    constructor(block, pos, parentContainer) {
        super(parentContainer, 'div', pos, FunctionBlockView.getBlockSize(block), {
            color: 'white',
            boxSizing: 'border-box',
            userSelect: 'none',
            borderRadius: '2px',
            cursor: 'grab'
        }, true);
        this._outputPinOffset = 0;
        this.blockEventHandler = (ev) => {
            switch (ev.type) {
                case 0 /* InputCountChanged */:
                case 1 /* OutputCountChanged */:
                    this.setSize(FunctionBlockView.getBlockSize(this.block));
                    if (this.visualStyle == 'minimal')
                        this.createSymbol();
                    else
                        this.createIONames();
                    this.changePinCount();
                    break;
                case 2 /* Removed */:
                    this.delete();
                    break;
                case 7 /* CallIndexChanged */:
                    this.callIndexIndicator.setText(this.block.callIndex.toString());
                    break;
                default:
                // console.log('FunctionBlockView: Unhandled block event!')
            }
        };
        this.onPointerEnter = () => this.setStyle({ backgroundColor: this.gui.style.colors.primaryHL });
        this.onPointerLeave = () => this.setStyle({ backgroundColor: this.gui.style.colors.primary });
        this.setStyle({
            backgroundColor: this.gui.style.colors.primary
        });
        block.events.subscribe(this.blockEventHandler);
        this.block = block;
        this.create();
    }
    getPinForIO(io) {
        let foundPin;
        foundPin = this.inputPins.find(pin => pin.io == io);
        foundPin ??= this.outputPins.find(pin => pin.io == io);
        return foundPin;
    }
    delete() {
        this.block.events.unsubscribe(this.blockEventHandler);
        super.delete();
    }
    setOutputPinOffset(offset) {
        if (this.block.outputs.length != 1)
            return;
        offset = Math.max(offset, 0);
        offset = Math.min(offset, this.block.inputs.length - 1);
        this._outputPinOffset = offset;
        this.outputPins[0].setPos(vec2(this.size.x, this._outputPinOffset));
    }
    get outputPinOffset() { return this._outputPinOffset; }
    get visualStyle() { return this.block.typeDef.visualStyle ?? 'full'; }
    onRescale() {
        this.create();
    }
    create() {
        if (this.visualStyle == 'full' || this.visualStyle.startsWith('name on first row'))
            this.createTitle();
        if (this.visualStyle == 'minimal')
            this.createSymbol();
        else
            this.createIONames();
        this.createPins();
        this.createCallIndexIndicator();
    }
    createPins() {
        this.inputPins ??= this.block.inputs.map((input, index) => {
            const pin = new IOPinView(input, vec2(-1, index), this.children);
            return pin;
        });
        this.outputPins ??= this.block.outputs.map((output, index) => {
            const pin = new IOPinView(output, vec2(this.size.x, index + this._outputPinOffset), this.children);
            return pin;
        });
    }
    changePinCount() {
        while (this.block.inputs.length > this.inputPins.length) {
            const index = this.inputPins.length;
            const input = this.block.inputs[index];
            const pin = new IOPinView(input, vec2(-1, index), this.children);
            this.inputPins.push(pin);
        }
        while (this.block.inputs.length < this.inputPins.length) {
            this.inputPins.pop();
        }
        while (this.block.outputs.length > this.outputPins.length) {
            const index = this.outputPins.length;
            const output = this.block.outputs[index];
            const pin = new IOPinView(output, vec2(this.size.x, index), this.children);
            this.outputPins.push(pin);
        }
        while (this.block.outputs.length < this.outputPins.length) {
            this.outputPins.pop();
        }
        this.create();
        if (this.outputPinOffset)
            this.setOutputPinOffset(this._outputPinOffset);
    }
    createCallIndexIndicator() {
        const callIndex = this.block.parentCircuit.getBlockIndex(this.block);
        this.callIndexIndicator ??= new HTML.Text(callIndex.toString(), {
            parent: this.DOMElement
        });
        this.callIndexIndicator.setCSS({
            position: 'absolute',
            top: (this.size.y - 0.3) * this.gui.scale.y + 'px',
            right: (-0.5) * this.gui.scale.x + 'px',
            height: this.gui.scale.y + 'px',
            lineHeight: this.gui.scale.y + 'px',
            color: this.gui.style.colors.callIndex,
            backgroundColor: this.gui.style.colors.callIndexBackground,
            borderRadius: '3px',
            fontWeight: 'normal',
            zIndex: '2',
            pointerEvents: 'none',
            paddingLeft: '3px',
            paddingRight: '3px',
        });
    }
    createTitle() {
        const gui = this.gui;
        this.titleElem ??= new HTML.Text(this.block.symbol, {
            parent: this.DOMElement
        });
        this.titleElem.setCSS({
            color: 'black',
            textAlign: 'center',
            width: '100%',
            height: gui.scale.y + 'px',
            padding: '0',
            pointerEvents: 'none',
        });
    }
    createSymbol() {
        const symbol = this.block.typeDef.symbol;
        const fontSize = (symbol.length < 3) ? '130%' : '100%';
        this.titleElem ??= new HTML.Text(symbol, {
            parent: this.DOMElement,
        });
        this.titleElem.setCSS({
            fontSize,
            color: 'black',
            textAlign: 'center',
            verticalAlign: 'middle',
            width: '100%',
            padding: '0',
            pointerEvents: 'none',
            lineHeight: this.size.y * this.gui.scale.y + 'px'
        });
    }
    createIONames() {
        const gui = this.gui;
        const [INPUT, OUTPUT] = [0, 1];
        const rowOffset = (this.titleElem) ? 1 : 0;
        const noOutputNames = (this.block.outputs.length == 1 && this.visualStyle != 'full');
        if (this.IONameTable)
            this.IONameTable.delete();
        this.IONameTable = new HTML.Table({
            rows: this.size.y - rowOffset,
            columns: 2,
            parentElement: this.DOMElement,
            tableStyle: {
                width: '100%',
                border: 'none',
                borderSpacing: '0px',
                pointerEvents: 'none',
                lineHeight: gui.scale.y + 'px'
            },
            rowStyle: {
                height: gui.scale.y + 'px',
                lineHeight: gui.scale.y + 'px',
            },
            cellStyle: {
                padding: '0',
                color: 'black'
            },
            cellIterator: (cell, row, col) => {
                if (noOutputNames && col == OUTPUT)
                    return;
                cell.textContent = (col == INPUT) ? (this.block.inputs[row + rowOffset]?.name ?? '')
                    : (this.block.outputs[row + rowOffset]?.name ?? '');
                cell.style.textAlign = (col == INPUT) ? 'left' : 'right';
                cell.style[(col == INPUT ? 'paddingLeft' : 'paddingRight')] = Math.round(gui.scale.x * 0.25) + 'px';
            }
        });
    }
    static getBlockSize(block) {
        let w, title;
        switch (block.typeDef.visualStyle ?? 'full') {
            case 'full':
                w = 5;
                title = 1;
                break;
            case 'no title':
                w = 3;
                title = 0;
                break;
            case 'no title min':
                w = 2;
                title = 0;
                break;
            case 'name on first row':
                w = 3;
                title = 0;
                break;
            case 'name on first row min':
                w = 2;
                title = 0;
                break;
            case 'minimal':
                w = 2;
                title = 0;
                break;
            default:
                w = 5;
                title = 1;
        }
        const h = Math.max(block.inputs.length, block.outputs.length) + title;
        return vec2(w, h);
    }
}
