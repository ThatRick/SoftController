import { getFunctionBlock } from './FunctionLib.js';
///////////////////////////////
//          Circuit
///////////////////////////////
var CircuitEventType;
(function (CircuitEventType) {
    CircuitEventType[CircuitEventType["BlockAdded"] = 0] = "BlockAdded";
    CircuitEventType[CircuitEventType["BlockRemoved"] = 1] = "BlockRemoved";
    CircuitEventType[CircuitEventType["Connected"] = 2] = "Connected";
    CircuitEventType[CircuitEventType["Disconnected"] = 3] = "Disconnected";
    CircuitEventType[CircuitEventType["Removed"] = 4] = "Removed";
})(CircuitEventType || (CircuitEventType = {}));
export default class Circuit {
    constructor(def) {
        this._blocks = new Set();
        this.subscribers = new Set();
        def.blocks.forEach(funcDef => {
            const block = getFunctionBlock(funcDef);
            this._blocks.add(block);
        });
    }
    get blocks() { return Array.from(this._blocks.values()); }
    addBlock(def) {
        const block = getFunctionBlock(def);
        this._blocks.add(block);
    }
    removeBlock(block) { }
    connect(inputPin, outputPin, inverted) { }
    disconnect(inputPin) { }
    subscribe(obj) {
        this.subscribers.add(obj);
    }
    unsubscribe(obj) {
        this.subscribers.delete(obj);
    }
    remove() {
        this.emitEvent(CircuitEventType.Removed);
        this.subscribers.clear();
    }
    emitEvent(type) {
        const event = { type, target: this };
        this.subscribers.forEach(fn => fn(event));
    }
}
