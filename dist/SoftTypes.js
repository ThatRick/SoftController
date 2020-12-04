import { sizeOfStruct } from './TypedStructs';
export var DatablockType;
(function (DatablockType) {
    DatablockType[DatablockType["TASKLIST"] = 0] = "TASKLIST";
    DatablockType[DatablockType["TASK"] = 1] = "TASK";
    DatablockType[DatablockType["CIRCUIT"] = 2] = "CIRCUIT";
    DatablockType[DatablockType["FUNCTION"] = 3] = "FUNCTION";
    DatablockType[DatablockType["DATA"] = 4] = "DATA";
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
    inputCount: 1 /* uint8 */,
    outputCount: 1 /* uint8 */,
    staticCount: 3 /* uint16 */,
    funcFlags: 1 /* uint8 */,
    reserve: 1 /* uint8 */
};
export const functionHeaderByteLength = sizeOfStruct(FunctionHeaderStruct);
export const TaskStruct = {
    blockID: 5 /* uint32 */,
    interval: 6 /* float */,
    offset: 6 /* float */,
    timeAccu: 6 /* float */,
    runCount: 5 /* uint32 */,
    cpuTimeInt: 5 /* uint32 */,
    cpuTime: 6 /* float */ // counts cpu milliseconds. Whole numbers are subracted and added to cpuTimeInt
};
export const taskStructByteLength = sizeOfStruct(TaskStruct);
