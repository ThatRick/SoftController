import { GUIChildElement } from '../GUI/GUIChildElement.js'
import { IContainerGUI } from '../GUI/GUITypes.js'
import Vec2, {vec2} from '../Lib/Vector2.js'
import { FunctionBlock } from './FunctionBlockState.js'
import CircuitView from './CircuitView.js'
import * as HTML from '../Lib/HTML.js'
import FunctionBlockPinView from './FunctionBlockPinView.js'
import { CircuitElement, ElementType } from './CircuitTypes.js'

const enum BlockDisplayType {
    Minimal,
    Name
}

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
    get id(): number { return this.state.id }
    gui: CircuitView

    isDraggable = true
    isSelectable = true
    isMultiSelectable = true

    state: FunctionBlock
    isMinimal: boolean
    
    inputPins: FunctionBlockPinView[] = []
    outputPins: FunctionBlockPinView[] = []

    name: string
    
    IONameTable: HTML.Table
    callIndexView: GUIChildElement
    footerView: GUIChildElement

    get callIndex() { return this.state.parentCircuit?.getBlockCallIndex(this.id) }

    constructor(circuitView: IContainerGUI, pos: Vec2, state: FunctionBlock)
    {
        super(circuitView, 'div', pos, FunctionBlockView.getBlockSize(state), {
            color: 'white',
            boxSizing: 'border-box',
            userSelect: 'none',
            borderRadius: '3px',
            backgroundColor: (state.onlineDB)
                ? circuitView.gui.style.colorBlockOnline
                : circuitView.gui.style.colorBlock,
        }, true)
        
        this.state = state
        this.isMinimal = FunctionBlockView.isMinimal(state)
        this.name = state.func?.name

        state.onStateUpdated = this.onStateUpdated.bind(this)

        this.build(this.gui)
        this.setInfoVisibility('hidden')
    }

    private build(gui: CircuitView) {
        this.createIONames()
        this.createPinViews()
        this.createCallIndexView()
        this.createFooterView()
    }

    onStateUpdated() {
        this.callIndexView.DOMElement.textContent = this.callIndex.toString()
        const text = (this.state.onlineDB) ? 'DB '+this.state.onlineDB : ''
        this.footerView.DOMElement.textContent = text
        this.DOMElement.style.backgroundColor = (this.state.onlineDB)
            ? this.gui.style.colorBlockOnline
            : this.gui.style.colorBlock
    }

    createPinViews() {
        for (let inputNum = 0; inputNum < this.state.funcData.inputCount; inputNum++) {
            this.createInputPin(inputNum)
        }
        for (let outputNum = 0; outputNum < this.state.funcData.outputCount; outputNum++) {
            this.createOutputPin(outputNum)
        }
    }

    createInputPin(inputNum: number) {
        const state = this.state
        const ioNum = inputNum
        this.inputPins[inputNum] = new FunctionBlockPinView(this.children, state, ioNum, vec2(-1, inputNum))
    }

    createOutputPin(outputNum: number) {
        const state = this.state
        const ioNum = state.funcData.inputCount + outputNum
        this.outputPins[outputNum] = new FunctionBlockPinView(this.children, state, ioNum, vec2(this.size.x, outputNum))
    }

    createIONames() {
        const gui = this.gui
        // show centered block name
        if (this.isMinimal) {
            const fontSize = (this.name.length == 1) ? '150%' : '100%'
            const nameElem = new HTML.Text(this.name, {
                parent: this.DOMElement,
                style: {
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    lineHeight: this._sizeScaled.y + 'px',
                    width: '100%',
                    padding: '0',
                    pointerEvents: 'none',
                    fontSize
                }
            })
        }
        // show io names
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
    
    createCallIndexView() {
        const size = vec2(this.size.x, 0.8)
        const pos = vec2(0, -size.y)
        this.callIndexView = new GUIChildElement(this.children, 'div', pos, size, {
            color: this.gui.style.colorCallIndex,
            lineHeight: size.y * this.gui.scale.y + 'px',
            textAlign: 'center'
        })
        this.callIndexView.DOMElement.textContent = this.callIndex.toString()
    }

    createFooterView() {
        const size = vec2(this.size.x, 0.8)
        const pos = vec2(0, this.size.y)
        this.footerView?.delete()
        this.footerView = new GUIChildElement(this.children, 'div', pos, size, {
            color: this.gui.style.colorOfflineID,
            lineHeight: size.y * this.gui.scale.y + 'px',
            textAlign: 'center',
            overflow: 'visible'
        })
        const text = (this.state.onlineDB) ? 'DB '+this.state.onlineDB : ''
        this.footerView.DOMElement.textContent = text
    }

    addInput() {
        if (this.state.func?.variableInputCount?.max > this.inputPins.length || this.state.isCircuit) {
            const inputNum = this.inputPins.length
            this.state.setInputCount(inputNum)
        }
    }

    setInfoVisibility(visibility: 'visible' | 'hidden') {
        this.callIndexView.DOMElement.style.visibility = visibility
        this.footerView.DOMElement.style.visibility = visibility
    }

    onSelected() {
        //this.DOMElement.style.outline = this.gui.style.blockOutlineSelected
        this.DOMElement.style.boxShadow = '0px 0px 0px 1px #fff inset'
    }

    onUnselected() {
        // this.DOMElement.style.outline = this.gui.style.blockOutlineUnselected
        this.DOMElement.style.boxShadow = 'none'
    }

    toFront() {
        this.parentContainer.DOMElement.appendChild(this.DOMElement)
    }

    onPointerEnter = () => {
        this.DOMElement.style.backgroundColor = this.gui.style.colorBlockHover
    }

    onPointerLeave = () => {
        this.DOMElement.style.backgroundColor = (this.state.onlineDB)
            ? this.gui.style.colorBlockOnline
            : this.gui.style.colorBlock
    }
}