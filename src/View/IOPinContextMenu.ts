
import * as HTML from '../Lib/HTML.js'
import Vec2 from '../Lib/Vector2.js'
import { BlockEventType } from '../State/FunctionBlock.js'
import IOPinView from './IOPinView.js'

export default function FunctionBlockContextMenu(options: {
    ioPinView: IOPinView,
    pos: Vec2,
    parentContainer: HTMLElement,
    destructor: () => void
})
{
    const {ioPinView, pos, parentContainer, destructor} = options
    
    const items = {
        'Invert':       (ioPinView.io.sourcePin && ioPinView.io.datatype == 'BINARY') ? () => { ioPinView.io.setInverted(!ioPinView.io.inverted) } : null,
        'Disconnect':   (ioPinView.io.sourcePin) ? () => { ioPinView.io.setSource(null) } : null
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