import CircuitView from './CircuitView.js'
import HTMLMenu from '../Lib/HTMLMenu.js'
import HTMLInput from '../Lib/HTMLInput.js'
import {defaultStyle} from '../Lib/HTML.js'
import Vec2, { vec2 } from '../Lib/Vector2.js'

export default function CircuitContextMenu(options: {
    circuitView: CircuitView,
    pos: Vec2,
    parentContainer: HTMLElement,
    destructor: () => void
})
{
    const {circuitView, pos, parentContainer, destructor} = options
    
    const items = {
        'Width': () => {
            const input = new HTMLInput({
                name: 'Circuit Width',
                value: circuitView.size.x,
                pos,
                parent: parentContainer,
                onSubmitValue: (value: number) => {
                    if (value != null) {
                        value = Math.trunc(value)
                        circuitView.resize(vec2(value, circuitView.size.y))
                    }
                    else console.log('Input canceled')
                    input.remove()
                }
            })
        },
        'Height': () => {
            const input = new HTMLInput({
                name: 'Circuit Height',
                value: circuitView.size.y,
                pos,
                parent: parentContainer,
                onSubmitValue: (value: number) => {
                    if (value != null) {
                        value = Math.trunc(value)
                        circuitView.resize(vec2(circuitView.size.x, value))
                    }
                    else console.log('Input canceled')
                    input.remove()
                }
            })
        },
        'Add block': () => { console.log('Add block clicked') },
    }
    const menu = new HTMLMenu(Object.keys(items), {
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