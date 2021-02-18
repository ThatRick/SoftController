import FunctionBlockView from './FunctionBlockView.js';
import IOPinView from './IOPinView.js';
export default function CircuitPointerHandler(circuit) {
    const pointer = circuit.pointer;
    const selection = circuit.selection;
    const onPointerDown = () => {
        const elem = pointer.targetElem;
        console.log('Target', elem);
        // Deselect all
        if (!elem || elem?.isSelectable) {
            selection.removeAll();
            return;
        }
        // Select Block
        if (elem instanceof FunctionBlockView) {
            selection.set(elem);
        }
        // Select Pin
        else if (elem instanceof IOPinView) {
            selection.set(elem);
        }
    };
    return {
        onPointerDown
    };
}
