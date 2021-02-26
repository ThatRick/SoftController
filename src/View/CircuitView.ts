import Vec2, { IVec2, vec2 } from '../Lib/Vector2.js'
import GUIView, { GUIEventType } from '../GUI/GUIView.js'
import Circuit from '../State/Circuit.js'
import { GUIChildElement } from '../GUI/GUIChildElement.js'
import * as HTML from '../Lib/HTML.js'
import { defaultStyle, Style } from './Common.js'
import { FunctionBlock, FunctionBlockInterface, FunctionTypeDefinition } from '../State/FunctionBlock.js'
import { CircuitBlock } from '../State/FunctionLib.js'
import FunctionBlockView from './FunctionBlockView.js'
import { EventEmitter } from '../Lib/Events.js'
import { IRootViewGUI } from '../GUI/GUITypes.js'
import CircuitSelection from './Selection.js'
import CircuitPointerHandler from './PointerHandler.js'

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

export const enum CircuitViewEventType {
    CircuitLoaded,
    CircuitClosed,
}

export interface CircuitViewEvent {
    type:   CircuitViewEventType
    target: ICircuitView
}

export interface ICircuitView extends IRootViewGUI
{
    style: Style,
    readonly circuitBlock: FunctionBlockInterface
    loadCircuitDefinition(circuitViewDefinition: CircuitViewDefinition)
}

export default class CircuitView extends GUIView<GUIChildElement, Style>
{
    static readonly IO_AREA_WIDTH = 5

    loadCircuitDefinition(circuitViewDefinition: CircuitViewDefinition) {
        const { definition, positions, size } = circuitViewDefinition
        this.resize(vec2(size))
        this._circuitBlock = new CircuitBlock(definition)
        this.circuit.blocks.forEach((block, index) => {
            const pos = positions.blocks[index]
            const blockView = new FunctionBlockView(block, vec2(pos), this.children)
            this.blockViews.add(blockView)
        })
        this.guiEvents.emit(CircuitViewEventType.CircuitLoaded)
    }
    
    blockViews = new Set<FunctionBlockView>()

    events = new EventEmitter<CircuitViewEvent>()

    selection = new CircuitSelection(this.style)

    get circuitBlock(): FunctionBlockInterface { return this._circuitBlock }


    constructor(parent: HTMLElement, size: Vec2, scale: Vec2, style: Readonly<Style> = defaultStyle)
    {
        super(parent, size, scale, style, {
            backgroundColor: style.colors.background,
            ...HTML.backgroundGridStyle(scale, style.colors.gridLines),
            fontFamily: 'system-ui',
            fontSize: Math.round(scale.y * style.fontSize)+'px'
        })
        this.pointer.attachEventHandler(CircuitPointerHandler(this))
    }
    
    protected onResize() {
    }
    
    protected onRescale() {
        this.onRestyle()
    }

    protected onRestyle() {
        this.setStyle({
            backgroundColor: this.style.colors.background,
            ...HTML.backgroundGridStyle(this.scale, this.style.colors.gridLines),
            fontSize: Math.round(this.scale.y * this.style.fontSize)+'px'
        })
    }


    protected _circuitBlock: FunctionBlock
    protected get circuit() { return this._circuitBlock?.circuit }
}