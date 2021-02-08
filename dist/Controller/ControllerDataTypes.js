import { defineStruct } from '../Lib/TypedStructs.js';
// DATA BLOCK HEADER
export const DatablockHeaderStruct = defineStruct({
    byteLength: 5 /* uint32 */,
    type: 1 /* uint8 */,
    flags: 1 /* uint8 */,
    parentID: 3 /* uint16 */,
});
// FUNCTION DATA HEADER
export const FunctionHeaderStruct = defineStruct({
    library: 1 /* uint8 */,
    opcode: 1 /* uint8 */,
    inputCount: 1 /* uint8 */,
    outputCount: 1 /* uint8 */,
    staticCount: 3 /* uint16 */,
    functionFlags: 3 /* uint16 */,
});
// TASK DATA
export const TaskStruct = defineStruct({
    targetRef: 5 /* uint32 */,
    interval_ms: 6 /* float */,
    offset_ms: 6 /* float */,
    timeAccu_ms: 6 /* float */,
    cpuTime_ms: 6 /* float */,
    cpuTimeInt_ms: 5 /* uint32 */,
    runCount: 5 /* uint32 */ // counts number of calls
});
// MONITOR VALUES DATA
export const MonitorValueChangeStruct = defineStruct({
    id: 3 /* uint16 */,
    ioNum: 3 /* uint16 */,
    value: 6 /* float */
});
export const BYTES_PER_VALUE = 4;
export const BYTES_PER_REF = 4;
export function alignBytes(addr, bytes = BYTES_PER_VALUE) {
    return Math.ceil(addr / bytes) * bytes;
}
const IOTypeBitMask = (1 /* TYPE_BIT0 */ | 2 /* TYPE_BIT1 */ | 4 /* TYPE_BIT2 */);
export function getIODataType(flags) {
    return (flags & IOTypeBitMask);
}
export function setIODataType(flags, ioType) {
    return (flags & ~IOTypeBitMask) | ioType;
}
