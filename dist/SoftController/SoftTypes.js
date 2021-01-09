import { sizeOfStruct } from '../Lib/TypedStructs.js';
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
export function getIOType(flags) {
    return (flags & IOTypeBitMask);
}
export function setIOType(flags, ioType) {
    return (flags & ~IOTypeBitMask) | ioType;
}
const IOTypeBitMask = (1 /* TYPE_BIT0 */ | 2 /* TYPE_BIT1 */ | 4 /* TYPE_BIT2 */);
