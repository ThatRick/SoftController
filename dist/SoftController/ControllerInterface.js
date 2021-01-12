import { alignBytes, BYTES_PER_REF, functionHeaderByteLength } from './SoftTypes.js';
export const MessageCodeNames = [
    'Undefined',
    'CreateController',
    'StartController',
    'StopController',
    'StepController',
    'CreateTask',
    'SetTaskCallTarget',
    'CreateCircuit',
    'ConnectCircuitOutput',
    'CreateFunctionBlock',
    'SetFunctionBlockIOValue',
    'SetFunctionBlockIOFlags',
    'ConnectFunctionBlockInput',
    'GetSystemSector',
    'GetTaskList',
    'GetTask',
    'GetDatablockList',
    'GetDatablockHeader',
    'GetDatablockRef',
    'GetDatablockID',
    'GetFunctionBlockHeader',
    'GetFunctionBlockData',
    'GetFunctionBlockIOValues',
    'GetCircuitData',
];
export function calcFunctionSize(inputCount, outputCount, staticCount) {
    const ioCount = inputCount + outputCount;
    let byteLength = functionHeaderByteLength; // Function header
    byteLength += alignBytes(ioCount); // IO flags
    byteLength += inputCount * BYTES_PER_REF; // Input references
    byteLength += (ioCount + staticCount) * BYTES_PER_REF; // IO and static values
    return byteLength;
}
export function calcCircuitSize(inputCount, outputCount, staticCount) {
    let byteLength = calcFunctionSize(inputCount, outputCount, staticCount);
    byteLength += outputCount * BYTES_PER_REF; // output references
    return byteLength;
}
