import Vec2, {vec2} from '../Lib/Vector2.js'
import { GUIChildElement } from '../GUI/GUIChildElement.js'
import { BlockEvent, BlockEventType, FunctionBlockInterface } from '../State/FunctionBlock.js'
import * as HTML from '../Lib/HTML.js'
import { IContainerGUI } from '../GUI/GUITypes.js'
import { defaultStyle, Style } from './Common.js'
import { BlockVisualStyle } from '../State/FunctionLib.js'

export default class FunctionBlockView extends GUIChildElement
{
    readonly block: FunctionBlockInterface
    
    constructor(block: FunctionBlockInterface, pos: Vec2, parentContainer: IContainerGUI, style: Style = defaultStyle )
    {
        super(parentContainer, 'div', pos, FunctionBlockView.getBlockSize(block), {
            color: 'white',
            boxSizing: 'border-box',
            userSelect: 'none',
            borderRadius: '2px',
            backgroundColor: style.colors.primary
        }, true)

        block.events.subscribe(this.blockEventHandler.bind(this))

        this.block = block
        this.create()
    }

    protected blockEventHandler(ev: BlockEvent) {
        switch (ev.type)
        {
            case BlockEventType.InputCount:
            case BlockEventType.OutputCount:
                this.setSize(FunctionBlockView.getBlockSize(this.block))
                if (this.visualStyle == 'minimum') this.createSymbol()
                else this.createIONames()
                break
            case BlockEventType.Removed:
                this.delete()
                break
            default:
                console.error('FunctionBlockView: Unhandled block event!')
        }
    }
    protected onRescale() {
        this.create()
    }

    protected get visualStyle() { return this.block.typeDef.visualStyle ?? 'full' }
    protected IONameTable: HTML.Table
    protected titleElem: HTML.Text
    
    protected create() {
        if (this.visualStyle == 'full' || this.visualStyle == 'name on first row') this.createTitle()
        if (this.visualStyle == 'minimum') this.createSymbol()
        else this.createIONames()
    }

    protected createTitle() {
        const gui = this.gui
        this.titleElem ??= new HTML.Text(this.block.typeName, {
            parent: this.DOMElement
        })
        this.titleElem.setStyle({
            color: 'black',
            textAlign: 'center',
            width: '100%',
            height: gui.scale.y + 'px',
            padding: '0',
            pointerEvents: 'none',
        },)
    }

    protected createSymbol() {
        const symbol = this.block.typeDef.symbol
        const fontSize = (symbol.length < 3) ? '130%' : '100%'
        this.titleElem ??= new HTML.Text(symbol, {
            parent: this.DOMElement,
        })
        this.titleElem.setStyle({
            fontSize,
            color: 'black',
            textAlign: 'center',
            verticalAlign: 'middle',
            width: '100%',
            padding: '0',
            pointerEvents: 'none',
            lineHeight: this.size.y*this.gui.scale.y + 'px'
        })
    }

    protected createIONames() {
        const gui = this.gui
        const [INPUT, OUTPUT] = [0, 1]

        const rowOffset = (this.titleElem) ? 1 : 0
        const noOutputNames = (this.block.outputs.length == 1 && this.visualStyle != 'full')

        if (this.IONameTable) this.IONameTable.delete()

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
                if (noOutputNames && col == OUTPUT) return
                cell.textContent = (col == INPUT) ? (this.block.inputs[row+rowOffset]?.name ?? '')
                                                  : (this.block.outputs[row+rowOffset]?.name ?? '')
                cell.style.textAlign = (col == INPUT) ? 'left' : 'right'
                cell.style[(col == INPUT ? 'paddingLeft' : 'paddingRight')] = Math.round(gui.scale.x * 0.25)+'px'
            }
        })
    }

    static getBlockSize(block: FunctionBlockInterface) {
        let w: number, title: number
        switch (block.typeDef.visualStyle ?? 'full') {
            case 'full':                w = 5;  title = 1;  break
            case 'no title':            w = 3;  title = 0;  break
            case 'no title min':        w = 2;  title = 0;  break
            case 'name on first row':   w = 3;  title = 0;  break
            case 'minimum':             w = 2;  title = 0;  break
            default:                    w = 5;  title = 1;
        }
        const h = Math.max(block.inputs.length, block.outputs.length) + title
        return vec2(w, h)
    }
}