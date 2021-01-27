import { GUIChildElement } from '../GUI/GUIChildElement.js'
import { IViewContainerGUI, IWindowGUI } from '../GUI/GUITypes.js'
import Vec2, {vec2} from '../Lib/Vector2.js'
import { FunctionBlock } from './FunctionBlockState.js'
import CircuitView from './CircuitView.js'
import * as HTML from '../Lib/HTML.js'
import FunctionBlockPinView from './FunctionBlockPinView.js'
import { CircuitElement, ElementType } from './CircuitTypes.js'

export default class FunctionBlockView extends GUIChildElement implements CircuitElement
{
    static isMinimal(state: FunctionBlock) {
        return (state.func?.inputs[0].name == undefined)
    }

    static getBlockSize(state: FunctionBlock) {
        const w = (FunctionBlockView.isMinimal(state) || state.func?.outputs[0].name == undefined) ? 3 : 6
        const h = Math.max(state.funcData.inputCount, state.funcData.outputCount)
        return vec2(w, h)
    }

    type: ElementType = 'block'
    get id(): number { return this.state.offlineID }
    gui: CircuitView

    isDraggable = true
    isSelectable = true
    isMultiSelectable = true

    state: FunctionBlock
    isMinimal: boolean
    
    inputPins: FunctionBlockPinView[] = []
    outputPins: FunctionBlockPinView[] = []

    name: string
    
    private IONameTable: HTML.Table
    callIndexView: GUIChildElement

    get callIndex() { return this.state.parentCircuit?.getBlockCallIndex(this.id) }

    constructor(circuitView: IViewContainerGUI, pos: Vec2, state: FunctionBlock)
    {
        super(circuitView, 'div', pos, FunctionBlockView.getBlockSize(state), {
            color: 'white',
            boxSizing: 'border-box',
            fontFamily: 'monospace',
            userSelect: 'none'
        }, true)
        
        this.state = state
        this.isMinimal = FunctionBlockView.isMinimal(state)
        this.name = state.func?.name

        state.onStateUpdated = this.onStateUpdated.bind(this)

        this.build(this.gui)
    }

    private build(gui: CircuitView) {
        this.setStyle({
            backgroundColor: this.gui.style.colorBlock,
            fontSize: Math.round(gui.scale.y * 0.65)+'px'
        })

        this.createIONames()
        this.createPins()
        this.createCallIndex()
    }

    onStateUpdated() {
        this.callIndexView.DOMElement.textContent = this.callIndex.toString()
    }

    createPins() {
        const state = this.state
        for (let inputNum = 0; inputNum < state.funcData.inputCount; inputNum++) {
            const ioNum = inputNum
            const name = (state.func) ? state.func.inputs[inputNum]?.name : inputNum.toString()
            this.inputPins[inputNum] = new FunctionBlockPinView(this.children, state, ioNum, vec2(-1, inputNum))
        }
        for (let outputNum = 0; outputNum < state.funcData.outputCount; outputNum++) {
            const ioNum = state.funcData.inputCount + outputNum
            const name = (state.func) ? state.func.outputs[outputNum]?.name : outputNum.toString()
            this.outputPins[outputNum] = new FunctionBlockPinView(this.children, state, ioNum, vec2(this.size.x, outputNum))
        }
    }

    createIONames() {
        const gui = this.gui
        if (this.isMinimal) {
            const nameElem = new HTML.Text(this.name, {
                textAlign: 'center',
                verticalAlign: 'middle',
                lineHeight: this._sizeScaled.y + 'px',
                width: '100%',
                padding: '0',
                pointerEvents: 'none'
            }, this.DOMElement)
        }
        else {
            const [INPUT, OUTPUT] = [0, 1]
    
            this.IONameTable = new HTML.Table({
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
                                                      : this.state?.func?.outputs[row]?.name
                    cell.style.textAlign = (col == INPUT) ? 'left' : 'right'
                    cell.style[(col == INPUT ? 'paddingLeft' : 'paddingRight')] = Math.round(gui.scale.x * 0.3)+'px'
                }
            })
        }
    }
    
    createCallIndex() {
        const size = vec2(this.size.x, 0.8)
        const pos = vec2(0, this.size.y)
        this.callIndexView = new GUIChildElement(this.children, 'div', pos, size, {
            color: this.gui.style.colorCallIndex,
            backgroundColor: this.gui.style.colorCallIndexBg,
            lineHeight: size.y * this.gui.scale.y + 'px',
            textAlign: 'center'
        })
        this.callIndexView.DOMElement.textContent = this.callIndex.toString()
        this.setCallIndexVisibility('hidden')
    }

    setCallIndexVisibility(visibility: 'visible' | 'hidden') {
        this.callIndexView.DOMElement.style.visibility = visibility
    }

    onSelected() {
        this.DOMElement.style.outline = this.gui.style.blockOutlineSelected
    }

    onUnselected() {
        this.DOMElement.style.outline = this.gui.style.blockOutlineUnselected
    }

    toFront() {
        this.parentContainer.DOMElement.appendChild(this.DOMElement)
    }

    onPointerEnter = () => {
        this.DOMElement.style.backgroundColor = this.gui.style.colorBlockHover
    }

    onPointerLeave = () => {
        this.DOMElement.style.backgroundColor = this.gui.style.colorBlock
    }
}