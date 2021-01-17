import { ID } from "../Controller/ControllerDataTypes"
import { Vec2 } from "../GUI/GUITypes"
import { Input, Output } from "./CircuitModel"
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
        public outputPin: FunctionBlockPinView<Output>,
        public inputPin: FunctionBlockPinView<Input>
    ) {
        this.id = inputPin.id
        layer.addTrace(this.id, outputPin.absPos, inputPin.absPos, outputPin.color)
        outputPin.onPinUpdated = this.updateColor.bind(this)
    }
    id: ID

    updateColor() {
        console.log('CircuitTrace: update pin color', this.id, this.outputPin.color)
        this.layer.setTraceColor(this.id, this.outputPin.color)
    }

    update() {
        this.layer.updateTrace(this.id, this.outputPin.absPos, this.inputPin.absPos)
        return false
    }
    delete() {

    }
    isConnectedTo(block: CircuitElement) {
        const isConnected = (this.inputPin.blockID == block.id || this.outputPin.blockID == block.id)
        return isConnected
    }
}