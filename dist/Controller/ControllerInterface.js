import { instructions } from '../FunctionCollection.js';
import { alignBytes, BYTES_PER_REF, functionHeaderByteLength } from './ControllerDataTypes.js';
export const MessageCodeNames = [
    'Undefined',
    'CreateController',
    'StartController',
    'StopController',
    'StepController',
    'SetMonitoring',
    'CreateTask',
    'SetTaskCallTarget',
    'CreateCircuit',
    'ConnectCircuitOutput',
    'SetFunctionCallIndex',
    'CreateFunctionBlock',
    'DeleteFunctionBlock',
    'SetFunctionBlockFlag',
    'SetFunctionBlockIOValue',
    'SetFunctionBlockIOFlags',
    'SetFunctionBlockIOFlag',
    'ConnectFunctionBlockInput',
    'GetSystemSector',
    'GetTaskList',
    'GetTask',
    'GetDatablockTable',
    'GetDatablockHeader',
    'GetDatablockRef',
    'GetDatablockID',
    'GetFunctionBlockHeader',
    'GetFunctionBlockData',
    'GetFunctionBlockIOValues',
    'GetCircuitData',
];
export const EventID = 0;
export const EventCodeNames = [
    'MonitoringValues'
];
export { instructions };
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
