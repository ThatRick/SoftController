import FunctionBlockView from './FunctionBlockView.js'
import HTMLMenu from '../Lib/HTMLMenu.js'
import Vec2 from '../Lib/Vector2.js'
import { BlockEventType } from '../State/FunctionBlock.js'

export default function FunctionBlockMenu(options: {
    block: FunctionBlockView,
    pos: Vec2,
    parentContainer: HTMLElement,
    destructor: () => void
})
{
    const {block, pos, parentContainer, destructor} = options
    const items = {
        'Input count': () => { console.log('Input count clicked') },
        'Insertion point': () => { console.log('Insertion point clicked') },
        'Copy': () => { console.log('Copy clicked') },
        'Replace': () => { console.log('Replace clicked') },
        'Delete': () => { block.delete() },
    }
    const menu = new HTMLMenu(Object.keys(items), {
        parent: parentContainer,
        menuStyle: {
            left: pos.x + 'px',
            top: pos.y + 'px',
            fontSize: '14px',
        },
        onItemSelected: (index: number, name: string) => {
            items[name]?.()
            destructor()
        }
    })

    return menu
}