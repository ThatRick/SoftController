export class CircuitTrace {
    constructor(layer, outputPin, inputPin) {
        this.layer = layer;
        this.outputPin = outputPin;
        this.inputPin = inputPin;
        this.id = inputPin.id;
        layer.addTrace(this.id, outputPin.absPos, inputPin.absPos, inputPin.color);
        inputPin.onPinUpdated = this.updateColor.bind(this);
    }
    updateColor() {
        this.layer.setTraceColor(this.id, this.inputPin.color);
    }
    update() {
        this.layer.updateTrace(this.id, this.outputPin.absPos, this.inputPin.absPos);
        return false;
    }
    delete() {
        this.layer.deleteTrace(this.id);
        this.inputPin.onPinUpdated = undefined;
    }
    isConnectedTo(block) {
        const isConnected = (block.type == 'circuitInput' || block.type == 'circuitOutput')
            ? (this.inputPin.id == block.id || this.outputPin.id == block.id)
            : (this.inputPin.blockID == block.id || this.outputPin.blockID == block.id);
        return isConnected;
    }
}
