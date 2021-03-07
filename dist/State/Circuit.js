import { getFunctionBlock } from './FunctionLib.js';
export default class Circuit {
    constructor(def, circBlock) {
        this.subscribers = new Set();
        this.circBlock = circBlock;
        // Create blocks
        const blocks = def.blocks.map(funcDef => getFunctionBlock(funcDef));
        // Set block input sources
        def.blocks.forEach((block, blockIndex) => {
            block.inputs?.forEach((input, inputIndex) => {
                if (input.source) {
                    const { blockNum, outputNum } = input.source;
                    // Connect to circuit input (blockNum = -1) or block output (blockNum = 0..n)
                    const sourcePin = (blockNum == -1)
                        ? circBlock.inputs[outputNum]
                        : blocks[blockNum].outputs[outputNum];
                    blocks[blockIndex].inputs[inputIndex].setSource(sourcePin);
                }
            });
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
