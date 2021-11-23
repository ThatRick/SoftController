export function generateCircuitViewDefinition(circuitView) {
    function getIOPinSourceFor(input) {
        const sourceIO = input.sourceIO;
        const sourceIsCircuitInput = (circuitView.circuitBlock.inputs.includes(sourceIO));
        const blockNum = (sourceIsCircuitInput)
            ? -1
            : circuitView.circuit.blocks.findIndex(block => block.outputs.includes(sourceIO));
        console.assert(Number.isInteger(blockNum));
        const outputNum = (sourceIsCircuitInput)
            ? circuitView.circuitBlock.inputs.findIndex(circuitInput => circuitInput == sourceIO)
            : circuitView.circuit.blocks[blockNum].outputs.findIndex(output => output == sourceIO);
        console.assert(outputNum > -1);
        return {
            blockNum,
            outputNum,
            inverted: input.inverted
        };
    }
    const circuitDef = {
        blocks: circuitView.circuit.blocks.map(block => ({
            typeName: block.typeName,
            inputs: block.inputs.reduce((obj, input) => {
                const inputDef = { value: input.value };
                if (input.sourceIO) {
                    inputDef.source = getIOPinSourceFor(input);
                }
                obj[input.name] = inputDef;
                return obj;
            }, {}),
            outputs: block.outputs.reduce((obj, output) => {
                obj[output.name] = { value: output.value };
                return obj;
            }, {}),
        })),
        circuitOutputSources: circuitView.circuitBlock.outputs.reduce((obj, output) => {
            if (output.sourceIO) {
                obj[output.name] = getIOPinSourceFor(output);
            }
            return obj;
        }, {})
    };
    const traces = [];
    circuitView.traceLines.forEach(traceLine => {
        const blockNum = traceLine.destPinView.io.block.callIndex ?? -1;
        console.assert(blockNum > -1 || traceLine.destPinView.io.block == circuitView.circuitBlock, 'Could not find dest block for traceLine', traceLine);
        const inputNum = traceLine.destPinView.io.ioNum;
        const trace = {
            blockNum,
            inputNum,
            anchors: { ...traceLine.route.anchors }
        };
        traces.push(trace);
    });
    const blockOutputPinOffsets = [];
    circuitView.blockViews.forEach(blockView => {
        if (blockView.outputPinOffset) {
            blockOutputPinOffsets.push({
                blockNum: blockView.block.callIndex,
                outputPinOffset: blockView.outputPinOffset
            });
        }
    });
    const def = {
        blockDef: {
            name: circuitView.name,
            inputs: circuitView.circuitBlock.inputs,
            outputs: circuitView.circuitBlock.outputs,
        },
        circuitDef,
        size: { x: circuitView.size.x, y: circuitView.size.y },
        positions: {
            blocks: circuitView.circuit.blocks.map(block => {
                const { x, y } = circuitView.blockViews.get(block).pos;
                return { x, y };
            }),
            inputs: circuitView.inputViews.map(inputView => inputView.pos.y),
            outputs: circuitView.outputViews.map(outputView => outputView.pos.y),
            traces,
            blockOutputPinOffsets
        }
    };
    return def;
}
export function exportToFile(obj, fileName) {
    const data = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.href = URL.createObjectURL(data);
    a.setAttribute('download', fileName);
    a.click();
    URL.revokeObjectURL(a.href);
    document.body.removeChild(a);
}
