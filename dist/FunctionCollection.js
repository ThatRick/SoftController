import { BooleanLogic } from './FunctionLibrary/BooleanLogic.js';
// Load function libraries
const functionLibraries = [
    null,
    BooleanLogic
];
export function getFunction(libraryID, opcode) {
    if (libraryID < 1 || libraryID >= functionLibraries.length) {
        console.error('Invalid function library id', libraryID);
        return null;
    }
    const library = functionLibraries[libraryID];
    if (opcode >= library.functions.length) {
        console.error('Invalid function opcode', opcode);
        return null;
    }
    const func = library.functions[opcode];
    if (!func)
        console.error('Error getting library function', libraryID, opcode);
    return func;
}
export function getFunctionName(libraryID, opcode) {
    const func = getFunction(libraryID, opcode);
    return func?.name;
}
