import { GUIChildEvent, GUIChildEventType } from "../GUI/GUIChildElement"
import { IChildElementGUI } from "../GUI/GUITypes"
import Vec2 from "../Lib/Vector2"
import IOPinView from "./IOPinView"
import TraceLayer, { TraceRoute } from "./TraceLayer"

export class TraceLine {
    route: TraceRoute

    constructor (
        public layer: TraceLayer,
        public sourcePin: IOPinView,
        public destPin: IOPinView,
    ) {
        const sourceMinReach = sourcePin.io.datatype == 'BINARY' ? 1 : 3
        const destMinReach = destPin.io.datatype == 'BINARY' ? 1 : 3

        this.route = layer.addTrace(sourcePin.absPos, destPin.absPos, sourceMinReach, destMinReach, this.getColor())

        this.sourcePin.events.subscribe(this.update.bind(this), [GUIChildEventType.Moved])
        this.destPin.events.subscribe(this.update.bind(this), [GUIChildEventType.Moved])
    }

    protected getColor(): string {
        return 'white'
    }

    updateColor() {
        this.layer.updateColor(this.route, this.sourcePin.color)
    }

    update(e: GUIChildEvent) {
        this.layer.updateTraceRoute(this.route, this.sourcePin.absPos, this.destPin.absPos)
    }

    delete() {
        this.layer.deleteTrace(this.route)
        this.sourcePin.events.unsubscribe(this.update)
        this.destPin.events.unsubscribe(this.update)
    }
}