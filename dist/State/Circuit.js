import { getFunctionBlock } from './FunctionLib.js';
import { EventEmitter } from "../Lib/Events.js";
export default class Circuit {
    addBlock(def, index) {
        const block = getFunctionBlock(def);
        block.parentCircuit = this;
        if (index != null) {
            this.blocks.splice(index, 0, block);
            this.blocks.forEach(block => block.events.emit(7 /* CallIndexChanged */));
        }
        else {
            this.blocks.push(block);
        }
        return block;
    }
    removeBlock(block) {
        // Remove connections to other blocks
        this.blocks.forEach(otherBlock => {
            otherBlock.inputs.forEach(input => {
                if (block.outputs.includes(input.sourceIO)) {
                    input.setSource(null);
                    console.log('connection cleared to removed block');
                }
            });
        });
        const index = this.getBlockIndex(block);
        console.log('removing block with index', index);
        if (index > -1)
            this.blocks.splice(index, 1);
        this.blocks.forEach(block => block.events.emit(7 /* CallIndexChanged */));
    }
    getBlockIndex(block) {
        return this.blocks.indexOf(block);
    }
    setBlockIndex(block, newIndex) {
        newIndex = Math.min(newIndex, this.blocks.length - 1);
        newIndex = Math.max(newIndex, 0);
        const currentIndex = this.getBlockIndex(block);
        this.blocks.splice(currentIndex, 1);
        this.blocks.splice(newIndex, 0, block);
        this.blocks.forEach(block => block.events.emit(7 /* CallIndexChanged */));
    }
    update(dt) {
        this.blocks.forEach(block => block.update(dt));
    }
    remove() {
        this.blocks.forEach(block => {
            block.parentCircuit = null;
            block.remove();
        });
        this.events.emit(4 /* Removed */);
        this.events.clear();
        this.blocks = null;
        this.circuitBlock = null;
        this.events = null;
    }
    get mode() { return this._mode; }
    setMode(mode, onlineConnection) {
        this._onlineConnection ??= onlineConnection;
        if (mode == 'offline' ||
            mode == 'online' && this._onlineConnection) {
            this._mode = mode;
        }
    }
    blocks;
    events = new EventEmitter(this);
    constructor(def, circuitBlock) {
        this.circuitBlock = circuitBlock;
        // Create blocks
        const blocks = def.blocks.map(funcDef => getFunctionBlock(funcDef));
        // Set this as parent circuit
        blocks.forEach(block => block.parentCircuit = this);
        // Connect block input sources if defined
        def.blocks.forEach((block, blockIndex) => {
            if (block.inputs) {
                Object.entries(block.inputs).forEach(([inputName, inputDef]) => {
                    if (inputDef.source) {
                        const input = blocks[blockIndex].inputs.find(input => input.name == inputName);
                        if (!input)
                            console.error('Invalid input name in block instance definition:', inputName);
                        else {
                            const { blockNum, outputNum, inverted = false } = inputDef.source;
                            // Connect to circuit input when blockNum = -1 or block output when blockNum >= 0
                            const sourcePin = (blockNum == -1)
                                ? circuitBlock.inputs[outputNum]
                                : blocks[blockNum].outputs[outputNum];
                            input.setSource(sourcePin);
                            input.setInversion(inverted);
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
                output.setInversion(inverted);
            }
        });
        this.blocks = blocks;
        console.log(this.blocks);
    }
    circuitBlock;
    _mode = 'offline';
    _onlineConnection;
}
