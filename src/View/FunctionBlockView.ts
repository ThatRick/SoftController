import Vec2, {vec2} from '../Lib/Vector2.js'
import { GUIChildElement } from '../GUI/GUIChildElement.js'
import { FunctionBlock, BlockEvent, BlockEventType, FunctionBlockInterface } from '../State/FunctionBlock.js'
import * as HTML from '../Lib/HTML.js'
import { IContainerGUI } from '../GUI/GUITypes.js'
import { defaultStyle, Style } from './Common.js'

export default class FunctionBlockView extends GUIChildElement
{
    readonly block: FunctionBlockInterface
    
    constructor(block: FunctionBlockInterface, pos: Vec2, parentContainer: IContainerGUI, style: Style = defaultStyle )
    {
        super(parentContainer, 'div', pos, FunctionBlockView.getBlockSize(block), {
            color: 'white',
            boxSizing: 'border-box',
            userSelect: 'none',
            borderRadius: '3px',
            backgroundColor: style.colors.primary
        }, true)

        block.events.subscribe(this.blockEventHandler.bind(this))

        this.block = block
        this.createTitle()
        this.createIONames()
    }

    protected blockEventHandler(ev: BlockEvent) {
        switch (ev.type)
        {
            case BlockEventType.InputCount:
            case BlockEventType.OutputCount:
                this.setSize(FunctionBlockView.getBlockSize(this.block))
                this.createIONames()
                break
            case BlockEventType.Removed:
                this.delete()
                break
            default:
                console.error('FunctionBlockView: Unhandled block event!')
        }
    }

    protected IONameTable: HTML.Table
    protected titleElem: HTML.Text

    protected createTitle() {
        const gui = this.gui

        this.titleElem = new HTML.Text(this.block.typeName, {
            color: 'black',
            textAlign: 'center',
            width: '100%',
            height: gui.scale.y + 'px',
            padding: '0',
            pointerEvents: 'none',
        }, this.DOMElement)
    }

    protected createIONames() {
        const gui = this.gui
        const [INPUT, OUTPUT] = [0, 1]

        if (this.IONameTable) this.IONameTable.delete()
        this.IONameTable = new HTML.Table({
            rows: this.size.y - 1,
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
                cell.textContent = (col == INPUT) ? (this.block.inputs[row]?.name ?? '')
                                                  : (this.block.outputs[row]?.name ?? '')
                cell.style.textAlign = (col == INPUT) ? 'left' : 'right'
                cell.style[(col == INPUT ? 'paddingLeft' : 'paddingRight')] = Math.round(gui.scale.x * 0.25)+'px'
            }
        })
    }

    static getBlockSize(block: FunctionBlockInterface) {
        const w = 4
        const h = Math.max(block.inputs.length, block.outputs.length) + 1
        return vec2(w, h)
    }
}