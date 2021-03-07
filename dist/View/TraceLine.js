export class TraceLine {
    constructor(layer, sourcePin, destPin) {
        this.layer = layer;
        this.sourcePin = sourcePin;
        this.destPin = destPin;
        const sourceMinReach = sourcePin.io.datatype == 'BINARY' ? 1 : 3;
        const destMinReach = destPin.io.datatype == 'BINARY' ? 1 : 3;
        this.route = layer.addTrace(sourcePin.absPos, destPin.absPos, sourceMinReach, destMinReach, this.getColor());
        this.sourcePin.events.subscribe(this.update.bind(this), [0 /* Moved */]);
        this.destPin.events.subscribe(this.update.bind(this), [0 /* Moved */]);
    }
    getColor() {
        return 'white';
    }
    updateColor() {
        this.layer.updateColor(this.route, this.sourcePin.color);
    }
    update(e) {
        this.layer.updateTraceRoute(this.route, this.sourcePin.absPos, this.destPin.absPos);
    }
    delete() {
        this.layer.deleteTrace(this.route);
        this.sourcePin.events.unsubscribe(this.update);
        this.destPin.events.unsubscribe(this.update);
    }
}
