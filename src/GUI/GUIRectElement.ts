import { IGUIView, IGUIContainer, IGUIElement, GUIPointerState, Vec2 } from './GUITypes.js'
import GUIElement from './GUIElement.js'
import GUIContainer from './GUIContainer.js'

export default class GUIRectElement extends GUIElement
{
    isMovable = true

    constructor(
        parent: IGUIContainer | undefined,
        elem:   HTMLElement | 'div',
        pos:    Vec2,
        size:   Vec2,
        style?: Partial<CSSStyleDeclaration>
    ) {
        super(parent, elem, pos, size, style, true)
    }

    init(gui: IGUIView) {
        super.init(gui)
    }

    update(gui: IGUIView, force: false): boolean {
        super.update(gui, force)
        return false
    }

    toFront() {
        this.parent.DOMElement.appendChild(this.DOMElement)
    }

    onPointerDown = (ev, pointer) => {
        this.toFront()
    }

    onDragEnded = (ev, pointer) => {
        const pos = this.pos.copy()
        pos.div(this.gui.scale).round().mul(this.gui.scale)
        this.pos = Vec2.round(this.pos)
    }
}