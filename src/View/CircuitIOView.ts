import Vec2, {vec2} from '../Lib/Vector2.js'
import { GUIChildElement } from '../GUI/GUIChildElement.js'
import { BlockEvent, BlockEventType, FunctionBlockInterface } from '../State/FunctionBlock.js'
import * as HTML from '../Lib/HTML.js'
import { IContainerGUI } from '../GUI/GUITypes.js'
import IOPinView from './IOPinView.js'
import CircuitView from './CircuitView.js'
import { IOPinInterface } from '../State/IOPin.js'

export default class FunctionBlockView extends GUIChildElement
{
    readonly pin: IOPinView

    readonly gui: CircuitView

    constructor(io: IOPinInterface, posY: number, parentContainer: IContainerGUI )
    {
        super(parentContainer, 'div', vec2(0, posY), vec2(CircuitView.IO_AREA_WIDTH, 1), {
            color: 'white',
            boxSizing: 'border-box',
            userSelect: 'none',
            borderRadius: '2px',
            cursor: 'grab'
        }, true)

        this.setStyle({
            backgroundColor: this.gui.style.colors.primary
        })

        const pinPosX = (io.type == 'input') ? CircuitView.IO_AREA_WIDTH : -1
        this.pin = new IOPinView(io, vec2(pinPosX, 0), this.children)
        this.create()
    }

    protected titleElem: HTML.Text

    protected onRescale() {
        this.create()
    }

    protected create() {
        this.createTitle()
    }

    protected createTitle() {
        const gui = this.gui
        this.titleElem ??= new HTML.Text(this.pin.io.name, {
            parent: this.DOMElement
        })
        this.titleElem.setCSS({
            color: 'black',
            textAlign: 'center',
            width: '100%',
            height: gui.scale.y + 'px',
            lineHeight: gui.scale.y + 'px',
            padding: '0',
            pointerEvents: 'none',
        },)
    }
    
    onPointerEnter = () => this.setStyle({ backgroundColor: this.gui.style.colors.primaryHL })
    onPointerLeave = () => this.setStyle({ backgroundColor: this.gui.style.colors.primary })

}