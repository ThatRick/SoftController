import { Vec2 } from './GUITypes.js'
import GUIView from './GUIView.js'
import TraceLayer from './TraceLayer.js'

export default class CircuitView extends GUIView
{
    traceLayer: TraceLayer

    constructor(parent: HTMLElement, size: Vec2, scale: Vec2) {
        super(parent, size, scale)

        this.traceLayer = new TraceLayer(this.DOMElement, this.scale)

    }

    addResizeObserver() {
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
            }

        })
        resizeObserver.observe(this.DOMElement)
    }
}
