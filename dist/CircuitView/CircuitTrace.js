export class CircuitTrace {
    constructor(layer, outputPin, inputPin) {
        this.layer = layer;
        this.outputPin = outputPin;
        this.inputPin = inputPin;
        this.id = inputPin.id;
        const pending = (!!inputPin.funcState.onlineID);
        const color = pending ? this.inputPin.gui.style.colorPending : inputPin.color;
        layer.addTrace(this.id, outputPin.absPos, inputPin.absPos, color);
        if (pending) {
            inputPin.funcState.onValidateInputRefModification[inputPin.ioNum] = this.validate.bind(this);
        }
        else {
            this.validate();
        }
    }
    validate() {
        this.inputPin.onPinUpdated = this.updateColor.bind(this);
        this.updateColor();
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
