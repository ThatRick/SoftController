import { GUIChildElement } from '../GUI/GUIChildElement.js';
import { vec2 } from '../Lib/Vector2.js';
import { Table } from '../Lib/HTML.js';
import FunctionBlockPinView from './FunctionBlockPinView.js';
export default class FunctionBlockView extends GUIChildElement {
    constructor(circuitView, pos, state) {
        super(circuitView, 'div', pos, FunctionBlockView.getBlockSize(state), {
            color: 'white',
            boxSizing: 'border-box',
            fontFamily: 'monospace',
            userSelect: 'none'
        }, true);
        this.type = 'block';
        this.isDraggable = true;
        this.isSelectable = true;
        this.isMultiSelectable = true;
        this.inputPins = [];
        this.outputPins = [];
        this.onPointerEnter = () => {
            this.DOMElement.style.backgroundColor = this.gui.style.colorBlockHover;
        };
        this.onPointerLeave = () => {
            this.DOMElement.style.backgroundColor = this.gui.style.colorBlock;
        };
        this.state = state;
        this.isMinimal = FunctionBlockView.isMinimal(state);
        this.name = state.func?.name;
        this.build(this.gui);
    }
    static isMinimal(state) {
        return (state.func?.inputs[0].name == undefined);
    }
    static getBlockSize(state) {
        const w = (FunctionBlockView.isMinimal(state)) ? 3 : 6;
        const h = Math.max(state.funcData.inputCount, state.funcData.outputCount);
        return vec2(w, h);
    }
    get id() { return this.state.offlineID; }
    build(gui) {
        this.setStyle({
            backgroundColor: this.gui.style.colorBlock,
            fontSize: Math.round(gui.scale.y * 0.65) + 'px'
        });
        this.createIONames();
        this.createPins();
    }
    createPins() {
        const state = this.state;
        for (let inputNum = 0; inputNum < state.funcData.inputCount; inputNum++) {
            const ioNum = inputNum;
            const name = (state.func) ? state.func.inputs[inputNum]?.name : inputNum.toString();
            this.inputPins[inputNum] = new FunctionBlockPinView(this.children, state, ioNum, vec2(-1, inputNum));
        }
        for (let outputNum = 0; outputNum < state.funcData.outputCount; outputNum++) {
            const ioNum = state.funcData.inputCount + outputNum;
            const name = (state.func) ? state.func.outputs[outputNum]?.name : outputNum.toString();
            this.outputPins[outputNum] = new FunctionBlockPinView(this.children, state, ioNum, vec2(this.size.x, outputNum));
        }
    }
    createIONames() {
        const gui = this.gui;
        if (this.isMinimal) {
            this.DOMElement.textContent = this.name;
            this.setStyle({
                textAlign: 'center',
                verticalAlign: 'middle',
                lineHeight: this._sizeScaled.y + 'px'
            });
        }
        else {
            const [INPUT, OUTPUT] = [0, 1];
            this.IONameTable = new Table({
                rows: this.size.y,
                columns: 2,
                parentElement: this.DOMElement,
                tableStyle: {
                    width: '100%',
                    border: 'none',
                    borderSpacing: '0px',
                    pointerEvents: 'none'
                },
                rowStyle: {
                    height: gui.scale.y + 'px'
                },
                cellStyle: {
                    color: 'white'
                },
                cellIterator: (cell, row, col) => {
                    cell.textContent = (col == INPUT) ? (this.state?.func?.inputs[row]?.name ?? ((row == 0 && this.state) ? this.name : 'FUNC'))
                        : this.state?.func?.outputs[row]?.name;
                    cell.style.textAlign = (col == INPUT) ? 'left' : 'right';
                    cell.style[(col == INPUT ? 'paddingLeft' : 'paddingRight')] = Math.round(gui.scale.x * 0.3) + 'px';
                }
            });
        }
    }
    onSelected() {
        this.DOMElement.style.outline = this.gui.style.blockOutlineSelected;
    }
    onUnselected() {
        this.DOMElement.style.outline = this.gui.style.blockOutlineUnselected;
    }
    toFront() {
        this.parentContainer.DOMElement.appendChild(this.DOMElement);
    }
}
