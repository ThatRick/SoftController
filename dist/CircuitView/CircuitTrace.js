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
        this.layer.setTraceColor(this.id, this.outputPin.color);
    }
    update() {
        this.layer.updateTrace(this.id, this.outputPin.absPos, this.inputPin.absPos);
        return false;
    }
    delete() {
        this.layer.deleteTrace(this.id);
        this.outputPin.onPinUpdated = undefined;
    }
    isConnectedTo(block) {
        const isConnected = (block.type == 'circuitInput' || block.type == 'circuitOutput')
            ? (this.inputPin.id == block.id || this.outputPin.id == block.id)
            : (this.inputPin.blockID == block.id || this.outputPin.blockID == block.id);
        return isConnected;
    }
}
