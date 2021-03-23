import { getFunctionBlock } from './FunctionLib.js';
import { EventEmitter } from "../Lib/Events.js";
export default class Circuit {
    constructor(def, circuitBlock) {
        this.events = new EventEmitter(this);
        this.circuitBlock = circuitBlock;
        // Create blocks
        const blocks = def.blocks.map(funcDef => getFunctionBlock(funcDef));
        function getSourcePin(source) {
        }
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
                                ? circuitBlock.inputs[outputNum]
                                : blocks[blockNum].outputs[outputNum];
                            input.setSource(sourcePin);
                            input.setInverted(inverted);
                        }
                    }
                });
            }
        });
        // Connect circuit outputs
        Object.entries(def.circuitOutputSources).forEach(([outputName, sourceIO]) => {
            const output = circuitBlock.outputs.find(output => output.name == outputName);
            if (!output)
                console.error('Invalid circuit output name in circuit definition:', outputName);
            else {
                const { blockNum, outputNum, inverted = false } = sourceIO;
                // Connect to circuit input (blockNum = -1) or block output (blockNum = 0..n)
                const sourcePin = (blockNum == -1)
                    ? circuitBlock.inputs[outputNum]
                    : blocks[blockNum].outputs[outputNum];
                output.setSource(sourcePin);
                output.setInverted(inverted);
            }
        });
        this._blocks = new Set(blocks);
    }
    get blocks() { return Array.from(this._blocks.values()); }
    addBlock(def) {
        const block = getFunctionBlock(def);
        block.parentCircuit = this;
        this._blocks.add(block);
        return block;
    }
    removeBlock(block) {
        // Remove connections to other blocks
        this._blocks.forEach(otherBlock => {
            otherBlock.inputs.forEach(input => {
                if (block.outputs.includes(input.sourceIO)) {
                    input.setSource(null);
                    console.log('connection cleared to removed block');
                }
            });
        });
        this._blocks.delete(block);
    }
    update(dt) {
        this._blocks.forEach(block => block.update(dt));
    }
    remove() {
        this._blocks.forEach(block => block.remove());
        this._blocks.clear();
        this._blocks = null;
        this.events.emit(4 /* Removed */);
        this.events.clear();
        this.events = null;
        this.circuitBlock = null;
    }
}
