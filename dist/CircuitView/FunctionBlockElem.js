import GUIElement from '../GUI/GUIElement.js';
import { vec2 } from '../Lib/Vector2.js';
import { Table } from '../Lib/HTML.js';
import FunctionBlockPinElem from './FunctionBlockPinElem.js';
export default class FunctionBlockElem extends GUIElement {
    constructor(circuitView, pos, funcBlock) {
        super(circuitView, 'div', pos, FunctionBlockElem.getBlockSize(funcBlock), {
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
        this.func = funcBlock;
        this.isMinimal = FunctionBlockElem.isMinimal(funcBlock);
    }
    static isMinimal(func) {
        return (func.inputs[0].name == undefined);
    }
    static getBlockSize(func) {
        const w = (FunctionBlockElem.isMinimal(func) || !func.outputs?.[0]?.name) ? 3 : 6;
        const h = Math.max(func.inputs.length, func.outputs.length);
        return vec2(w, h);
    }
    get id() { return this.func.onlineID; }
    onInit(gui) {
        this.setStyle({
            backgroundColor: this.gui.style.colorBlock,
            fontSize: Math.round(gui.scale.y * 0.65) + 'px'
        });
        this.createNames(gui);
        this.createPins(gui);
    }
    createPins(gui) {
        this.func.inputs.forEach((input, i) => {
            this.inputPins[i] = new FunctionBlockPinElem(this.children, input, vec2(-1, i));
        });
        this.func.outputs.forEach((output, i) => {
            this.outputPins[i] = new FunctionBlockPinElem(this.children, output, vec2(this.size.x, i));
        });
    }
    createNames(gui) {
        if (this.isMinimal) {
            this.DOMElement.textContent = this.func.name;
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
                    cell.textContent = (col == INPUT) ? (this.func?.inputs[row]?.name ?? ((row == 0 && this.func) ? this.func.name : 'FUNC'))
                        : this.func?.outputs[row]?.name;
                    cell.style.textAlign = (col == INPUT) ? 'left' : 'right';
                    cell.style[(col == INPUT ? 'paddingLeft' : 'paddingRight')] = Math.round(gui.scale.x * 0.3) + 'px';
                }
            });
        }
    }
    selected() {
        this.DOMElement.style.outline = this.gui.style.blockOutlineSelected;
    }
    unselected() {
        this.DOMElement.style.outline = this.gui.style.blockOutlineUnselected;
    }
    toFront() {
        this.parent.DOMElement.appendChild(this.DOMElement);
    }
}
