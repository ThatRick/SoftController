import Vec2, { IVec2, vec2 } from '../Lib/Vector2.js'
import GUIView from '../GUI/GUIView.js'
import Circuit from '../State/Circuit.js'
import { GUIChildElement } from '../GUI/GUIChildElement.js'
import * as HTML from '../Lib/HTML.js'
import { defaultStyle, Style } from './Common.js'
import { FunctionBlock, FunctionBlockInterface, FunctionTypeDefinition } from '../State/FunctionBlock.js'
import { CircuitBlock } from '../State/FunctionLib.js'
import FunctionBlockView from './FunctionBlockView.js'

export interface CircuitViewDefinition
{
    definition: FunctionTypeDefinition
    size: IVec2
    positions: {
        blocks: IVec2[]
        inputs: number[]
        outputs: number[]
    }
}

export default class CircuitView extends GUIView<GUIChildElement, Style>
{
    loadCircuitDefinition(circuitViewDefinition: CircuitViewDefinition) {
        const { definition, positions, size } = circuitViewDefinition
        this.setSize(vec2(size))
        this._circuitBlock = new CircuitBlock(definition)
        this.circuit.blocks.forEach((block, index) => {
            const pos = positions.blocks[index]
            const blockView = new FunctionBlockView(block, vec2(pos), this.children, this.style)
            this.blockViews.add(blockView)
        })
    }

    get circuitBlock(): FunctionBlockInterface { return this._circuitBlock }

    constructor(parent: HTMLElement, size: Vec2, scale: Vec2, style: Readonly<Style> = defaultStyle)
    {
        super(parent, size, scale, style, {
            backgroundColor: style.colors.background,
            ...HTML.backgroundGridStyle(scale, style.colors.dark),
            fontFamily: 'system-ui',
            fontSize: Math.round(scale.y * style.fontSize)+'px'
        })
    }

    protected blockViews = new Set<FunctionBlockView>()
    protected _circuitBlock: FunctionBlock
    protected get circuit() { return this._circuitBlock?.circuit }
}