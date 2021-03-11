import FunctionBlockView from './FunctionBlockView.js'
import HTMLMenu from '../Lib/HTMLMenu.js'
import HTMLInput from '../Lib/HTMLInput.js'
import {defaultStyle} from '../Lib/HTML.js'
import Vec2 from '../Lib/Vector2.js'
import { BlockEventType } from '../State/FunctionBlock.js'

export default function FunctionBlockContextMenu(options: {
    blockView: FunctionBlockView,
    pos: Vec2,
    parentContainer: HTMLElement,
    destructor: () => void
})
{
    const {blockView, pos, parentContainer, destructor} = options
    
    const items = {
        'Input count': (blockView.block.variableInputs) ? () => {
            const input = new HTMLInput({
                name: 'Input count',
                value: blockView.block.inputs.length,
                pos,
                parent: parentContainer,
                onSubmitValue: (value: number) => {
                    if (value != null) {
                        value = Math.trunc(value)
                        blockView.block.setVariableInputCount(value)
                    }
                    else console.log('Input canceled')
                    input.remove()
                }
            })
        } : null,
        'Insertion point': null,
        'Copy': null,
        'Replace': null,
        'Delete': () => { blockView.block.remove() },
    }
    const menu = new HTMLMenu(items, {
        parent: parentContainer,
        menuStyle: {
            left: pos.x + 'px',
            top: pos.y + 'px',
            fontSize: defaultStyle.fontSize + 'px',
        },
        onItemSelected: (index: number, name: string) => {
            items[name]?.()
            destructor()
        }
    })

    return menu
}