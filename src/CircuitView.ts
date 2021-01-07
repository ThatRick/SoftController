import { Vec2 } from './GUI/GUITypes.js'
import GUIView from './GUI/GUIView.js'
import TraceLayer from './TraceLayer.js'
import CircuitGrid from './CircuitGrid.js'



export default class CircuitView extends GUIView
{
    traceLayer: TraceLayer
    gridMap = new CircuitGrid()

    constructor(parent: HTMLElement, size: Vec2, scale: Vec2) {
        super(parent, size, scale)

        this.traceLayer = new TraceLayer(this.DOMElement, this.scale)
    }

}
