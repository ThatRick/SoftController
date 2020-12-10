import SoftController from './SoftController.js'
import { DatablockType } from './SoftTypes.js';

function makeLogger(div: HTMLElement) {
    return function logLine(text: string) {
        const pre = document.createElement('pre');
        pre.textContent = text;
        div.appendChild(pre);
    }
}

//////////////////////////
//  PROGRAM ENTRY POINT
//
window.onload = () =>
{
    const logLine = makeLogger(document.getElementById('main'));

    const memSize = 16 * 1024;
    const cpu = new SoftController(memSize);
    window['cpu'] = cpu;
    
    logLine(systemSectorToString(cpu));

    const funcs = createTestBlocks(cpu, 10);

    funcs.forEach(func => logLine(functionToString(cpu, func)));

    logLine(systemSectorToString(cpu));
    logLine(datablockTableToString(cpu));
}


////////////////////
//  CREATE A TEST
//
function createTestBlocks(cpu: SoftController, blockCount = 10) {
    // test
    const circId = cpu.createCircuit(4, 2, 256);
    const funcs: number[] = [circId]
    const maxOpcode = 7
    const logicLib = 0;
    for (let i = 1; i < blockCount+1; i++) {
        const opcode = i % maxOpcode
        const funcId = cpu.createFunctionBlock(logicLib, opcode, circId);
        funcs.push(funcId);
        const funcInfo = cpu.getFunctionHeaderByID(funcId);
        const sourceId = funcs[i-1];
        const sourceInfo = cpu.getFunctionHeaderByID(sourceId);
        const inputNum = i % (funcInfo.inputCount-1);
        const sourceIONum = sourceInfo.inputCount;
        cpu.connectFunctionInput(funcId, inputNum, sourceId, sourceIONum);
    }
    const taskId = cpu.createTask(circId, 20, 5);
    console.log(cpu.getTaskByID(taskId));

    // cpu.deleteDatablock(funcs[2]);
    // cpu.deleteDatablock(funcs[3]);

    const interval = 10 // ms
    const ticks = 200
    const loop = setInterval(() => cpu.tick(interval), interval)
    
    setTimeout(() => {
        clearTimeout(loop);
        const task = cpu.getTaskByID(taskId);
        const totalCPUtime = task.cpuTimeInt + task.cpuTime;
        const avgCPUtime = totalCPUtime / task.runCount;
        console.log(`Total cpu time ${totalCPUtime.toPrecision(5)} ms. Average time ${avgCPUtime.toPrecision(5)} ms (${task.runCount} runs)`);
        console.dir(task);
    }, interval * ticks)

    return funcs;
}


const breakLine = '='.repeat(80)


/////////////////////////////////////
//  Print function block to string
//
function functionToString(cpu: SoftController, funcID: number): string {
    const type = cpu.getDatablockHeaderByID(funcID).type;
    if (type != DatablockType.FUNCTION && type != DatablockType.CIRCUIT) return 'Invalid function ID: ' + funcID

    let text = ''
    const addLine = (line: string) => text += (line + '\n');

    const funcHeader = cpu.getFunctionHeaderByID(funcID);
    const ioValues = cpu.getFunctionIOValues(funcID);
    const ioFlags = cpu.getFunctionIOFlags(funcID);
    const inputRefs = cpu.getFunctionInputRefs(funcID);
    
    const func = (type == DatablockType.FUNCTION) ? cpu.functionLibraries[funcHeader.library].getFunction(funcHeader.opcode) : null;
    const funcName = (func) ? cpu.functionLibraries[funcHeader.library].getFunctionName(funcHeader.opcode) : 'CIRCUIT';

    const inputRefLen = 6;
    const valueLen = 8;
    const precision = 6;
    const inputNameLen = 9;
    const outputNameLen = 6;
    const rows = Math.max(funcHeader.inputCount, funcHeader.outputCount);

    addLine(breakLine);
    addLine(`${funcName} (ID: ${funcID})`)
    addLine('');
    addLine(`${' '.repeat(inputRefLen+3)} ${' '.repeat(valueLen)}   _${'_'.repeat(inputNameLen)}${'_'.repeat(outputNameLen)}_`);

    for (let i = 0; i < rows; i++) {
        const inputRef = (i < inputRefs.length && inputRefs[i] != 0) ? inputRefs[i].toString().padStart(inputRefLen)+' ->' : ' '.repeat(inputRefLen+3);
        const inputValue = (i < funcHeader.inputCount) ? ioValues[i].toPrecision(precision).padStart(valueLen) : ' '.repeat(valueLen);
        const inputName = (func && i < func.inputs.length) ? ((func.inputs[i].name) ? func.inputs[i].name.padEnd(inputNameLen)
                                                                                    : ((i == 0) ? funcName.padEnd(inputNameLen)
                                                                                                : ' '.repeat(inputNameLen)))
                                                           : ' '.repeat(inputNameLen);

        const outNum = i + funcHeader.inputCount;
        const outputName = (func && i < func.outputs.length && func.outputs[i].name) ? func.outputs[i].name.padStart(outputNameLen) : ' '.repeat(outputNameLen);
        const outputValue = (i < funcHeader.outputCount) ? ioValues[outNum].toPrecision(precision).padStart(valueLen) : ' '.repeat(valueLen);

        const line = `${inputRef} ${inputValue} -| ${inputName}${outputName} |- ${outputValue}`
        addLine(line);
    }
    addLine(`${' '.repeat(inputRefLen+3)} ${' '.repeat(valueLen)}   -${'-'.repeat(inputNameLen)}${'-'.repeat(outputNameLen)}-`);

    return text;
}

//////////////////////////////
//  Print circuit to string
//
function circuitToString(cpu: SoftController, circuitID: number): string {
    let text = ''
    const addLine = (line: string) => text += (line + '\n');
    const blockHeader = cpu.getDatablockHeaderByID(circuitID);
    const funcHeader = cpu.getFunctionHeaderByID(circuitID);

    return text;
}

///////////////////////////////////////////
//  Print data block table info to string
//
function datablockTableToString(cpu: SoftController): string {
    const typeNames = ['UNDEFINED', 'UNALLOCATED', 'TASK', 'CIRCUIT', 'FUNCTION', 'DATA']
    const maxTypeNameLength = (typeNames.reduce((a, b) => (a.length > b.length) ? a : b)).length;

    let text = '';
    const addLine = (line: string) => text += (line + '\n');

    addLine(breakLine)
    addLine(`Data block table listing (size: ${cpu.datablockTable.length})`)
    addLine('')

    cpu.datablockTable.forEach((offset, id) => {
        if (offset) {
            const header = cpu.getDatablockHeaderByID(id);
            const startAddr = offset.toString(16).toUpperCase()
            const endAddr = (offset + header.byteLength - 1).toString(16).toUpperCase()
            addLine(`${id.toString().padStart(3, '0')}:  ${typeNames[header.type].padEnd(maxTypeNameLength)}  \
${header.byteLength.toString().padStart(6)} bytes  [${startAddr} - ${endAddr}]  ${(header.parentID) ? 'parent: '+header.parentID : ''}`);
        }
    })
    return text;
}

//////////////////////////////////////////////
//  Print system sector parameters to string
//
function systemSectorToString(cpu: SoftController): string {
    const systemParameterNames = [
        'id',
        'version',
        'total memory (bytes)',
        'data block table ref',
        'data block table length',
        'data block table last used ID',
        'data block table version',
        'task list ref',
        'task list length'
    ]
    const maxParamNameLength = (systemParameterNames.reduce((a, b) => (a.length > b.length) ? a : b)).length;
    let text = ''
    const addLine = (line: string) => text += (line + '\n');
    
    addLine(breakLine);
    addLine(`System sector parmeters`)
    addLine('')

    for (let i = 0; i < cpu.systemSector.length; i++) {
        addLine(`${i}:  ${systemParameterNames[i].padEnd(maxParamNameLength)}  ${cpu.systemSector[i].toString().padStart(6)}`);
    }
    addLine('');
    return text
}
