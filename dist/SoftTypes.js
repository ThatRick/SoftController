import { sizeOfStruct } from './TypedStructs.js';
export var DatablockType;
(function (DatablockType) {
    DatablockType[DatablockType["UNDEFINED"] = 0] = "UNDEFINED";
    DatablockType[DatablockType["UNALLOCATED"] = 1] = "UNALLOCATED";
    DatablockType[DatablockType["TASK"] = 2] = "TASK";
    DatablockType[DatablockType["CIRCUIT"] = 3] = "CIRCUIT";
    DatablockType[DatablockType["FUNCTION"] = 4] = "FUNCTION";
    DatablockType[DatablockType["DATA"] = 5] = "DATA";
})(DatablockType || (DatablockType = {}));
export const DatablockHeaderStruct = {
    byteLength: 5 /* uint32 */,
    type: 1 /* uint8 */,
    flags: 1 /* uint8 */,
    parentID: 3 /* uint16 */,
};
export const datablockHeaderByteLength = sizeOfStruct(DatablockHeaderStruct);
export const FunctionHeaderStruct = {
    library: 1 /* uint8 */,
    opcode: 1 /* uint8 */,
    inputCount: 1 /* uint8 */,
    outputCount: 1 /* uint8 */,
    staticCount: 3 /* uint16 */,
    funcFlags: 1 /* uint8 */,
    reserve: 1 /* uint8 */
};
export const functionHeaderByteLength = sizeOfStruct(FunctionHeaderStruct);
export const TaskStruct = {
    targetRef: 5 /* uint32 */,
    interval: 6 /* float */,
    offset: 6 /* float */,
    timeAccu: 6 /* float */,
    cpuTime: 6 /* float */,
    cpuTimeInt: 5 /* uint32 */,
    runCount: 5 /* uint32 */ // counts number of calls
};
export const taskStructByteLength = sizeOfStruct(TaskStruct);
