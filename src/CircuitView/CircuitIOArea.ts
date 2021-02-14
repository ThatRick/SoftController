import { GUIChildElement } from '../GUI/GUIChildElement.js'
import Vec2, { vec2 } from '../Lib/Vector2.js'
import * as HTML from '../Lib/HTML.js'
import { CircuitElement, ElementType } from './CircuitTypes.js'
import CircuitView from './CircuitView.js'
import CircuitIOView from './CircuitIOView.js'
import { Circuit } from './CircuitState.js'

////////////////////////////////////
//    Circuit Input/Output Area
////////////////////////////////////

export default class IOArea extends GUIChildElement implements CircuitElement
{
    constructor(view: CircuitView, type: 'inputArea' | 'outputArea')
    {
        super(view.children, 'div',
            (type == 'inputArea') ? vec2(0, 0) : vec2(view.size.x - view.style.IOAreaWidth, 0),
            vec2(view.style.IOAreaWidth, view.size.y), {
                //borderRight: '1px solid '+view.style.colorPanelLines,
                backgroundColor: view.style.colorPanel,
                ...HTML.backgroundLinesStyle(Vec2.mul(vec2(view.style.IOAreaWidth, 1), view.scale), view.style.colorPanelLines)
            }, true)
        this.type = type
    }
    createCircuitIOViews(circuit: Circuit) {
        this.circuit = circuit
        let ioNumStart: number
        let ioNumEnd: number
        if (this.type == 'inputArea') {
            ioNumStart = 0
            ioNumEnd = circuit.funcState.funcData.inputCount - 1
        } else {
            ioNumStart = circuit.funcState.funcData.inputCount
            ioNumEnd = ioNumStart + circuit.funcState.funcData.outputCount - 1
        }
        for (let ioNum = ioNumStart; ioNum <= ioNumEnd; ioNum++) {
            this.ioViews.push(new CircuitIOView(this.children, circuit, ioNum, vec2(0, ioNum + 2) ))
        }
    }
    circuit: Circuit
    type: ElementType
    ioViews: CircuitIOView[] = []
    get id(): number { return this.circuit.funcState.id }
    gui: CircuitView
}