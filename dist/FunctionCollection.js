import { BooleanLogic } from './FunctionLibrary/BooleanLogic.js';
import { Arithmetic } from './FunctionLibrary/Arithmetic.js';
class FunctionCollection {
    constructor(libraries) {
        this.libraries = new Map();
        libraries.forEach(lib => this.libraries.set(lib.id, lib));
    }
    getFunction(libID, opcode) {
        const lib = this.libraries.get(libID);
        if (!lib) {
            console.error('Invalid function library id', libID);
            return;
        }
        const func = lib?.functions[opcode];
        if (!func) {
            console.error('Invalid function opcode', opcode);
            return;
        }
        return func;
    }
    getFunctionName(libID, opcode) {
        return this.getFunction(libID, opcode)?.name;
    }
}
export const instructions = new FunctionCollection([
    BooleanLogic,
    Arithmetic
]);
