import { CircuitDefinition } from '../State/Circuit.js'
import { IOPinInstanceDefinition, IOPinInterface, IOPinSource } from '../State/IOPin.js'
import CircuitView, { CircuitViewDefinition } from './CircuitView.js'

export function generateCircuitViewDefinition(circuitView: CircuitView)
{
    function getIOPinSourceFor(input: IOPinInterface): IOPinSource
    {
        const sourceIO = input.sourceIO
        const sourceIsCircuitInput = (circuitView.circuitBlock.inputs.includes(sourceIO))
        const blockNum = (sourceIsCircuitInput)
            ? -1
            : circuitView.circuit.blocks.findIndex(block => block.outputs.includes(sourceIO))
        
        console.assert(Number.isInteger(blockNum))
        
        const outputNum = (sourceIsCircuitInput)
            ? circuitView.circuitBlock.inputs.findIndex(circuitInput => circuitInput == sourceIO)
            : circuitView.circuit.blocks[blockNum].outputs.findIndex(output => output == sourceIO)
        
        console.assert(outputNum > -1)
        
        return {
            blockNum,
            outputNum,
            inverted: input.inverted
        }
    }

    const circuit: CircuitDefinition = {
        blocks: circuitView.circuit.blocks.map(block => ({
            typeName: block.typeName,

            inputs: block.inputs.reduce((obj, input) => {
                const inputDef: IOPinInstanceDefinition = { value: input.value }
                if (input.sourceIO) {
                    inputDef.source = getIOPinSourceFor(input)
                }
                obj[input.name] = inputDef

                return obj
            }, {}),

            outputs: block.outputs.reduce((obj, output) => {
                obj[output.name] = { value: output.value }
                return obj
            }, {}),
        })),
        circuitOutputSources: circuitView.circuitBlock.outputs.reduce((obj, output) => {
            if (output.sourceIO) {
                obj[output.name] = getIOPinSourceFor(output)
            }
            return obj
        }, {})
    }
    const traces = []
    circuitView.traceLines.forEach(traceLine => {
        const blockNum = circuitView.circuit.blocks.findIndex(block => block == traceLine.destPinView.io.block)
        console.assert(blockNum > -1 || traceLine.destPinView.io.block == circuitView.circuitBlock, 'Could not find dest block for traceLine', traceLine)
        const inputNum = traceLine.sourcePinView.io.ioNum
        const trace = {
            blockNum,
            inputNum,
            anchors: { ...traceLine.route.anchors }
        }
        traces.push(trace)
    })
    const def: CircuitViewDefinition = {
        definition: {
            name: circuitView.name,
            inputs: circuitView.circuitBlock.inputs.reduce((obj, input) => {
                obj[input.name] = {
                    dataType: input.datatype,
                    value: input.value,
                }
                return obj
            }, {}),
            outputs: circuitView.circuitBlock.outputs.reduce((obj, output) => {
                obj[output.name] = {
                    dataType: output.datatype,
                    value: output.value,
                }
                return obj
            }, {}),
            circuit
        },
        size: {x: circuitView.size.x, y: circuitView.size.y},
        positions: {
            blocks: circuitView.circuit.blocks.map(block => {
                const {x, y} = circuitView.blockViews.get(block).pos
                return {x, y}
            }),
            inputs: circuitView.inputViews.map(inputView => inputView.pos.y),
            outputs: circuitView.outputViews.map(outputView => outputView.pos.y),
            traces
        }
    }

    return def
}

export function exportToFile(obj: Object, fileName: string) {
    const data = new Blob([JSON.stringify(obj, null, 2)], {type: 'application/json'});

    const a = document.createElement('a');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.href = URL.createObjectURL(data);
    a.setAttribute('download', fileName);
    a.click();
    URL.revokeObjectURL(a.href);
    document.body.removeChild(a);
}