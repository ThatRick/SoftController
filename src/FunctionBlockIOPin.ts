import GUIElement from './GUI/GUIElement.js'
import { IGUIContainer, IGUIView } from './GUI/GUITypes.js'
import Vec2, {vec2} from './Lib/Vector2.js'
import { FunctionBlock, FunctionBlockIO } from './CircuitModel.js'


export default class FunctionBlockIOPin extends GUIElement
{
    io: FunctionBlockIO
    
    constructor(parent: IGUIContainer, io: FunctionBlockIO, pos: Vec2, size: Vec2) {
        super(parent, 'div', pos, size, {
            backgroundColor: '#AAA'
        })

        this.io = io
    }
}