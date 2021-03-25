import CircuitView, { CircuitIOArea } from './CircuitView.js'
import * as HTML from '../Lib/HTML.js'
import Vec2, { vec2 } from '../Lib/Vector2.js'
import { IODataType } from '../State/CommonTypes.js'

export default function CircuitIOAreaContextMenu(options: {
    ioArea: CircuitIOArea,
    pos: Vec2,
    parentContainer: HTMLElement,
    destructor: () => void
})
{
    const {ioArea, pos, parentContainer, destructor} = options
    const circuitView = ioArea.circuitView
    const posY = Math.trunc(pos.y / circuitView.scale.y)

    function nameInputField(dataType: IODataType) {
        const nameInput = new HTML.InputField({
            name: 'IO Name',
            value: (ioArea.type == 'input')
                ? 'Input' + circuitView.circuitBlock.inputs.length
                : 'Output' + circuitView.circuitBlock.outputs.length,
            pos,
            parent: parentContainer,
            onSubmitText: (name: string) => {
                if (name != null) {
                    circuitView.addCircuitIO(ioArea.type, dataType, name, posY)
                }
                nameInput.remove()
            }
        })
    }

    const items = {
        'Add binary': () => nameInputField('BINARY'),
        'Add float': () => nameInputField('FLOAT'),
        'Add integer': () => nameInputField('INTEGER'),
    }
    const menuXpos = (ioArea.type == 'input') ? { left: '0px' } : { right: '0px' }

    const menu = new HTML.Menu(items, {
        parent: parentContainer,
        menuStyle: {
            ...menuXpos,
            top: pos.y + 'px',
            fontSize: HTML.defaultStyle.fontSize + 'px',
        },
        onItemSelected: (index: number, itemName: keyof typeof items) => {
            items[itemName]()
            destructor()
        }
    })

    return menu
}