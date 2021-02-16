import { vec2 } from '../Lib/Vector2.js';
import GUIView from '../GUI/GUIView.js';
import * as HTML from '../Lib/HTML.js';
import { defaultStyle } from './Common.js';
import { CircuitBlock } from '../State/FunctionLib.js';
import FunctionBlockView from './FunctionBlockView.js';
export default class CircuitView extends GUIView {
    constructor(parent, size, scale, style = defaultStyle) {
        super(parent, size, scale, style, {
            backgroundColor: style.colors.background,
            ...HTML.backgroundGridStyle(scale, style.colors.dark),
            fontFamily: 'system-ui',
            fontSize: Math.round(scale.y * style.fontSize) + 'px'
        });
        this.blockViews = new Set();
    }
    loadCircuitDefinition(circuitViewDefinition) {
        const { definition, positions, size } = circuitViewDefinition;
        this.setSize(vec2(size));
        this._circuitBlock = new CircuitBlock(definition);
        this.circuit.blocks.forEach((block, index) => {
            const pos = positions.blocks[index];
            const blockView = new FunctionBlockView(block, vec2(pos), this.children, this.style);
            this.blockViews.add(blockView);
        });
    }
    get circuitBlock() { return this._circuitBlock; }
    get circuit() { return this._circuitBlock?.circuit; }
}
