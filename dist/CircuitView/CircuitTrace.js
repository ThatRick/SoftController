export class CircuitTrace {
    constructor(layer, outputPin, inputPin) {
        this.layer = layer;
        this.outputPin = outputPin;
        this.inputPin = inputPin;
        this.id = inputPin.id;
        layer.addTrace(this.id, outputPin.absPos, inputPin.absPos, outputPin.color);
        outputPin.onPinUpdated = this.updateColor.bind(this);
    }
    updateColor() {
        console.log('CircuitTrace: update pin color', this.id, this.outputPin.color);
        this.layer.setTraceColor(this.id, this.outputPin.color);
    }
    update() {
        this.layer.updateTrace(this.id, this.outputPin.absPos, this.inputPin.absPos);
        return false;
    }
    delete() {
    }
    isConnectedTo(block) {
        const isConnected = (this.inputPin.blockID == block.id || this.outputPin.blockID == block.id);
        return isConnected;
    }
}
