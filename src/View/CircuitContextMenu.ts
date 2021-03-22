import CircuitView from './CircuitView.js'
import * as HTML from '../Lib/HTML.js'
import Vec2, { vec2 } from '../Lib/Vector2.js'
import { functionLib, FunctionTypeName, functionTypeNames } from '../State/FunctionLib.js'

export default function CircuitContextMenu(options: {
    circuitView: CircuitView,
    pos: Vec2,
    parentContainer: HTMLElement,
    destructor: () => void
})
{
    const {circuitView, pos, parentContainer, destructor} = options
    
    const items = {
        'Add block': () => {
            const submenu = new HTML.Menu(functionLib, {
                parent: parentContainer,
                menuStyle: {
                    left: pos.x + 'px',
                    top: pos.y + 'px',
                    fontSize: HTML.defaultStyle.fontSize + 'px',
                },
                onItemSelected: (index: number, name: string) => {
                    console.log('function menu selection:', name)
                    circuitView.addFunctionBlock(name as FunctionTypeName, Vec2.div(pos, circuitView.scale))
                    destructor()
                }
            })
            return submenu
        },
        'Width': () => {
            const input = new HTML.InputField({
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
            const input = new HTML.InputField({
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
    }
    const menu = new HTML.Menu(items, {
        parent: parentContainer,
        menuStyle: {
            left: pos.x + 'px',
            top: pos.y + 'px',
            fontSize: HTML.defaultStyle.fontSize + 'px',
        },
        onItemSelected: (index: number, itemName: keyof typeof items) => {
            if (itemName == 'Add block') {
                const submenu = items[itemName]()
                menu.attachSubmenu(submenu)
            }
            else {
                items[itemName]()
                destructor()
            }
        }
    })

    return menu
}