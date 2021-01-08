import { LogicLib } from './SoftFuncLib.js';
// Load function libraries
const functionLibraries = [
    null,
    LogicLib
];
export function getFunction(libraryID, opcode) {
    if (libraryID < 1 || libraryID >= functionLibraries.length) {
        console.error('Invalid function library id', libraryID);
        return null;
    }
    const library = functionLibraries[libraryID];
    if (opcode >= Object.keys(library.functions).length) {
        console.error('Invalid function opcode', opcode);
        return null;
    }
    const func = library.getFunction(opcode);
    return func;
}
export function getFunctionName(libraryID, opcode) {
    if (libraryID < 1 || libraryID >= functionLibraries.length) {
        console.error('Invalid function library id', libraryID);
        return null;
    }
    const library = functionLibraries[libraryID];
    if (opcode >= Object.keys(library.functions).length) {
        console.error('Invalid function opcode', opcode);
        return null;
    }
    const name = library.getFunctionName(opcode);
    return name;
}
