import GUIView from '../GUI/GUIView.js';
import TraceLayer from './TraceLayer.js';
import CircuitGrid from './CircuitGrid.js';
import { defaultStyle } from './CircuitTypes.js';
export default class CircuitView extends GUIView {
    constructor(parent, size, scale) {
        super(parent, size, scale);
        this.gridMap = new CircuitGrid();
        this.style = defaultStyle;
        this.traceLayer = new TraceLayer(this.DOMElement, this.scale);
    }
}
