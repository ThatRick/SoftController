import GUIElement from '../GUI/GUIElement.js'
import { IGUIContainer, IGUIView } from '../GUI/GUITypes.js'
import Vec2, {vec2} from '../Lib/Vector2.js'
import { FunctionBlock, FunctionBlockIO } from './CircuitModel.js'
import { domElement } from '../Lib/HTML.js'
import { CircuitElement, ElementType, PinType } from './CircuitTypes.js'

export default class FunctionBlockPinElem extends GUIElement implements CircuitElement
{
    id: number
    type: ElementType

    io: FunctionBlockIO
    pin: HTMLDivElement
    
    constructor(parent: IGUIContainer, io: FunctionBlockIO, pos: Vec2) {
        super(parent, 'div', pos, null, {
            backgroundColor: '#AAA'
        })

        this.io = io
        this.type = io.pinType
    }

    onInit(gui: IGUIView) {

        const size = vec2(0.5, 0.2)
        const yOffset = 0.5 - size.y / 2
        
        const scaledOffset = Vec2.mul((this.type == 'input') ? vec2(1-size.x, yOffset) : vec2(0, yOffset), gui.scale)
        const scaledSize = Vec2.mul(size, gui.scale)

        this.pin = domElement(this.DOMElement, 'div', {
            position:   'absolute',
            left:       scaledOffset.x + 'px',
            top:        scaledOffset.y + 'px',
            width:      scaledSize.x + 'px',
            height:     scaledSize.y + 'px'
        })
    }

    onPointerEnter = (ev: PointerEvent) => {

    }
}