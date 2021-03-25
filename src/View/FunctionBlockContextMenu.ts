import FunctionBlockView from './FunctionBlockView.js'
import * as HTML from '../Lib/HTML.js'
import Vec2 from '../Lib/Vector2.js'
import { BlockEventType } from '../State/FunctionBlock.js'
import CircuitSelection from './Selection.js'
import CircuitView from './CircuitView.js'

export default function FunctionBlockContextMenu(pars: {
    selection: CircuitSelection,
    pos: Vec2,
    parentContainer: HTMLElement,
    destructor: () => void
})
{
    const {selection, pos, parentContainer, destructor} = pars
    const singleSelection = selection.singleBlock
    
    const items = {
        'Call index': () => {
            const input = new HTML.InputField({
                name: 'Call index',
                value: singleSelection.block.callIndex,
                pos,
                parent: parentContainer,
                onSubmitValue: (value: number) => {
                    if (value != null) {
                        value = Math.trunc(value)
                        singleSelection.block.setCallIndex(value)
                    }
                    input.remove()
                }
            })
        },
        'Input count': (singleSelection?.block.variableInputs) ? () => {
            const input = new HTML.InputField({
                name: 'Input count',
                value: singleSelection.block.inputs.length,
                pos,
                parent: parentContainer,
                onSubmitValue: (value: number) => {
                    if (value != null) {
                        value = Math.trunc(value)
                        singleSelection.block.setVariableInputCount(value)
                    }
                    input.remove()
                }
            })
        } : null,
        'Output offset': (singleSelection?.block.outputs.length == 1 && singleSelection?.block.inputs.length > 1) ? () => {
            const input = new HTML.InputField({
                name: 'Output pin offset',
                value: singleSelection.outputPinOffset,
                pos,
                parent: parentContainer,
                onSubmitValue: (value: number) => {
                    if (value != null) {
                        value = Math.trunc(value)
                        singleSelection.setOutputPinOffset(value)
                    }
                    input.remove()
                }
            })
        } : null,
        'Insertion point': null,
        'Copy': null,
        'Replace': null,
        'Delete': () => {
            pars.selection.blocks?.forEach(blockView => blockView.block.remove())
            pars.selection.unselectAll()
        },
    }
    const menu = new HTML.Menu(items, {
        parent: parentContainer,
        menuStyle: {
            left: pos.x + 'px',
            top: pos.y + 'px',
            fontSize: HTML.defaultStyle.fontSize + 'px',
        },
        onItemSelected: (index: number, name: string) => {
            items[name]?.()
            destructor()
        }
    })

    return menu
}