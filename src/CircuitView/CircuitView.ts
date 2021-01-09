import { Vec2 } from '../GUI/GUITypes.js'
import GUIView from '../GUI/GUIView.js'
import TraceLayer from './TraceLayer.js'
import CircuitGrid from './CircuitGrid.js'
import { CircuitElement, CircuitStyle, defaultStyle } from './CircuitTypes.js'

export default class CircuitView extends GUIView<CircuitElement>
{
    traceLayer: TraceLayer
    gridMap = new CircuitGrid()
    style: CircuitStyle = defaultStyle

    constructor(parent: HTMLElement, size: Vec2, scale: Vec2)
    {
        super(parent, size, scale)

        this.traceLayer = new TraceLayer(this.DOMElement, this.scale)
    }

    onPointerDown = (ev: PointerEvent) => {
        const elem = this.pointer.downTargetElem
        elem && console.log('Clicked on', {
            type: elem.type,
            id: elem.id,
            pos: elem.absPos.toString()
        })
    }
}
