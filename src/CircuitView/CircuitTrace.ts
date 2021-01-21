import { ID } from "../Controller/ControllerDataTypes"
import { Vec2 } from "../GUI/GUITypes"
import { CircuitElement } from "./CircuitTypes"
import FunctionBlockPinView from "./FunctionBlockPinView"

export interface ICircuitTraceLayer {
    addTrace(id: number, outputPos: Vec2, inputPos: Vec2, color: string)
    updateTrace(id: number, outputPos: Vec2, inputPos: Vec2)
    deleteTrace(id: number)
    setTraceColor(id: number, color: string)
    onTraceSelected: (id: number) => void
}

export class CircuitTrace {
    constructor(
        public layer: ICircuitTraceLayer,
        public outputPin: FunctionBlockPinView,
        public inputPin: FunctionBlockPinView
    ) {
        this.id = inputPin.id
        layer.addTrace(this.id, outputPin.absPos, inputPin.absPos, inputPin.color)
        inputPin.onPinUpdated = this.updateColor.bind(this)
    }
    id: ID

    updateColor() {
        this.layer.setTraceColor(this.id, this.inputPin.color)
    }

    update() {
        this.layer.updateTrace(this.id, this.outputPin.absPos, this.inputPin.absPos)
        return false
    }
    delete() {
        this.layer.deleteTrace(this.id)
        this.inputPin.onPinUpdated = undefined
    }
    isConnectedTo(block: CircuitElement) {
        const isConnected = (block.type == 'circuitInput' || block.type == 'circuitOutput')
            ? (this.inputPin.id == block.id || this.outputPin.id == block.id)
            : (this.inputPin.blockID == block.id || this.outputPin.blockID == block.id)
        return isConnected
    }
}