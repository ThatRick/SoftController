import Vec2 from "../Lib/Vector2"
import IOPinView from "./IOPinView"
import TraceLayer, { ITracePath } from "./TraceLayer"

export class TraceLine {
    path: ITracePath

    constructor (
        public layer: TraceLayer,
        public outputPin: IOPinView,
        public inputPin: IOPinView,
    ) {
        const sourceMinReach = outputPin.io.datatype == 'BINARY' ? 1 : 3
        const destMinReach = inputPin.io.datatype == 'BINARY' ? 1 : 3
        this.path = layer.addTrace(outputPin.absPos, inputPin.absPos, sourceMinReach, destMinReach, this.getColor())
    }

    protected getColor(): string {
        return 'white'
    }

    updateColor() {
        this.layer.updateColor(this.path, this.outputPin.color)
    }

    update() {
        this.layer.updatePath(this.path, this.outputPin.absPos, this.inputPin.absPos)
    }
    delete() {
        this.layer.deleteTrace(this.path)
    }
}