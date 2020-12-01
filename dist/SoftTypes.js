import { sizeOfStruct } from './TypedStructs';
export var DatablockType;
(function (DatablockType) {
    DatablockType[DatablockType["CIRCUIT"] = 0] = "CIRCUIT";
    DatablockType[DatablockType["FUNCTION"] = 1] = "FUNCTION";
    DatablockType[DatablockType["DATA"] = 2] = "DATA";
})(DatablockType || (DatablockType = {}));
export const DatablockHeaderStruct = {
    byteLength: 5 /* uint32 */,
    type: 1 /* uint8 */,
    flags: 1 /* uint8 */,
    reserve: 3 /* uint16 */
};
export const datablockHeaderByteLength = sizeOfStruct(DatablockHeaderStruct);
export const FunctionHeaderStruct = {
    library: 1 /* uint8 */,
    opcode: 1 /* uint8 */,
    funcFlags: 1 /* uint8 */,
    inputCount: 1 /* uint8 */,
    outputCount: 1 /* uint8 */,
    staticCount: 1 /* uint8 */,
    reserve: 3 /* uint16 */
};
export const functionHeaderByteLength = sizeOfStruct(FunctionHeaderStruct);
