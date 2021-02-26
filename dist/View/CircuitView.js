import { vec2 } from '../Lib/Vector2.js';
import GUIView from '../GUI/GUIView.js';
import * as HTML from '../Lib/HTML.js';
import { defaultStyle } from './Common.js';
import { CircuitBlock } from '../State/FunctionLib.js';
import FunctionBlockView from './FunctionBlockView.js';
import { EventEmitter } from '../Lib/Events.js';
import CircuitSelection from './Selection.js';
import CircuitPointerHandler from './PointerHandler.js';
export default class CircuitView extends GUIView {
    constructor(parent, size, scale, style = defaultStyle) {
        super(parent, size, scale, style, {
            backgroundColor: style.colors.background,
            ...HTML.backgroundGridStyle(scale, style.colors.gridLines),
            fontFamily: 'system-ui',
            fontSize: Math.round(scale.y * style.fontSize) + 'px'
        });
        this.blockViews = new Set();
        this.events = new EventEmitter();
        this.selection = new CircuitSelection(this.style);
        this.pointer.attachEventHandler(CircuitPointerHandler(this));
    }
    loadCircuitDefinition(circuitViewDefinition) {
        const { definition, positions, size } = circuitViewDefinition;
        this.resize(vec2(size));
        this._circuitBlock = new CircuitBlock(definition);
        this.circuit.blocks.forEach((block, index) => {
            const pos = positions.blocks[index];
            const blockView = new FunctionBlockView(block, vec2(pos), this.children);
            this.blockViews.add(blockView);
        });
        this.guiEvents.emit(0 /* CircuitLoaded */);
    }
    get circuitBlock() { return this._circuitBlock; }
    onResize() {
    }
    onRescale() {
        this.onRestyle();
    }
    onRestyle() {
        this.setStyle({
            backgroundColor: this.style.colors.background,
            ...HTML.backgroundGridStyle(this.scale, this.style.colors.gridLines),
            fontSize: Math.round(this.scale.y * this.style.fontSize) + 'px'
        });
    }
    get circuit() { return this._circuitBlock?.circuit; }
}
