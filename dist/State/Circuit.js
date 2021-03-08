import { getFunctionBlock } from './FunctionLib.js';
export default class Circuit {
    constructor(def, circBlock) {
        this.subscribers = new Set();
        this.circBlock = circBlock;
        // Create blocks
        const blocks = def.blocks.map(funcDef => getFunctionBlock(funcDef));
        // Set block input sources
        def.blocks.forEach((block, blockIndex) => {
            if (block.inputs) {
                Object.entries(block.inputs).forEach(([inputName, inputDef]) => {
                    if (inputDef.source) {
                        const input = blocks[blockIndex].inputs.find(input => input.name == inputName);
                        if (!input)
                            console.error('Invalid input name in block instance definition:', inputName);
                        else {
                            const { blockNum, outputNum, inverted = false } = inputDef.source;
                            // Connect to circuit input (blockNum = -1) or block output (blockNum = 0..n)
                            const sourcePin = (blockNum == -1)
                                ? circBlock.inputs[outputNum]
                                : blocks[blockNum].outputs[outputNum];
                            input.setSource(sourcePin);
                            input.setInverted(inverted);
                        }
                    }
                });
            }
        });
        this._blocks = new Set(blocks);
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
    update(dt) {
        this._blocks.forEach(block => block.update(dt));
    }
    remove() {
        this.emitEvent(4 /* Removed */);
        this.subscribers.clear();
    }
    emitEvent(type) {
        const event = { type, target: this };
        this.subscribers.forEach(fn => fn(event));
    }
}
