import Vec2, {vec2} from '../Lib/Vector2.js'
import { GUIChildElement, GUIChildEvent, GUIChildEventType } from '../GUI/GUIChildElement.js'
import { BlockEvent, BlockEventType, FunctionBlockInterface } from '../State/FunctionBlock.js'
import * as HTML from '../Lib/HTML.js'
import { IContainerGUI } from '../GUI/GUITypes.js'
import IOPinView, { IOPinViewEvent } from './IOPinView.js'
import CircuitView from './CircuitView.js'
import { IOPinEvent, IOPinEventType, IOPinInterface } from '../State/IOPin.js'

export default class FunctionBlockView extends GUIChildElement
{
    readonly pin: IOPinView

    declare readonly gui: CircuitView

    constructor(io: IOPinInterface, posY: number, parentContainer: IContainerGUI )
    {
        super(parentContainer, 'div', vec2(0, posY), vec2(CircuitView.IO_AREA_WIDTH, 1), null, true)
        
        this.setStyle({
            color: 'white',
            boxSizing: 'border-box',
            userSelect: 'none',
            borderRadius: '2px',
            borderBottom: '1px solid ' + this.gui.style.colors.dark,
            backgroundColor: this.gui.style.colors.primary,
            cursor: 'grab',
        })

        const pinPosX = (io.type == 'input') ? CircuitView.IO_AREA_WIDTH : -1
        this.pin = new IOPinView(io, vec2(pinPosX, 0), this.children)
        this.pin.events.subscribe(this.guiChildEventHandler, [GUIChildEventType.Removed])
        this.pin.io.events.subscribe(this.ioEventHandler, [IOPinEventType.NameChanged])

        this.create()
    }

    protected ioEventHandler = (ev: IOPinEvent) => {
        if (ev.type == IOPinEventType.NameChanged) {
            this.nameElem.setText(this.pin.io.name)
        }
    }

    protected guiChildEventHandler = (ev: GUIChildEvent) => {
        if (ev.type == GUIChildEventType.Removed) {
            this.delete()
        }
    }

    protected nameElem: HTML.Text

    protected onRescale() {
        this.create()
    }

    protected create() {
        this.createTitle()
    }

    protected createTitle() {
        const gui = this.gui
        this.nameElem ??= new HTML.Text(this.pin.io.name, {
            parent: this.DOMElement
        })
        this.nameElem.setCSS({
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