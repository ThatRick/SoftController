import GUIView from './GUIView.js';
import TraceLayer from './TraceLayer.js';
export default class CircuitView extends GUIView {
    constructor(parent, size, scale) {
        super(parent, size, scale);
        this.traceLayer = new TraceLayer(this.DOMElement, this.scale);
    }
    addResizeObserver() {
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
            }
        });
        resizeObserver.observe(this.DOMElement);
    }
}
