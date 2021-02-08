import { BooleanLogic } from './FunctionLibrary/BooleanLogic.js';
import { Arithmetic } from './FunctionLibrary/Arithmetic.js';
import { Filters } from './FunctionLibrary/Filters.js';
class FunctionCollection {
    constructor(libraries) {
        this.libraryMap = new Map();
        libraries.forEach(lib => this.libraryMap.set(lib.id, lib));
    }
    get libraries() {
        return Array.from(this.libraryMap.values());
    }
    getFunction(libID, opcode) {
        const lib = this.libraryMap.get(libID);
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
    Arithmetic,
    Filters
]);
