import GUIView from './GUI/GUIView.js';
import TraceLayer from './TraceLayer.js';
import CircuitGrid from './CircuitGrid.js';
export default class CircuitView extends GUIView {
    constructor(parent, size, scale) {
        super(parent, size, scale);
        this.gridMap = new CircuitGrid();
        this.traceLayer = new TraceLayer(this.DOMElement, this.scale);
    }
}
