import { GUIChildElement } from '../GUI/GUIChildElement.js'
import { IContainerGUI } from '../GUI/GUITypes.js'
import Vec2, { vec2 } from '../Lib/Vector2.js'
import { IOPinInterface } from '../State/IOPin.js'
import { defaultStyle, Style } from './Common.js'

export default class IOPinView extends GUIChildElement
{
    constructor(ioPin: IOPinInterface, pos: Vec2, parentContainer: IContainerGUI, style: Style = defaultStyle )
    {
        super(parentContainer, 'div', pos, vec2(1, 1), {
            backgroundColor: 'red'
        })
    }
}