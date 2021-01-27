import { DatablockType, getIODataType, IODataType, IOFlag, IORef } from "./Controller/ControllerDataTypes.js";
import { IControllerInterface, instructions } from "./Controller/ControllerInterface.js";

export class ControllerTerminal
{
    constructor(
        private div: HTMLElement,
        private cpu: IControllerInterface)
    {
    }

    print(text: string) {
        const pre = document.createElement('pre');
        pre.textContent = text;
        this.div.appendChild(pre);
    }

    clear() {
        while (this.div.firstChild) this.div.lastChild.remove()
        return
    }

    breakLine = '='.repeat(80)


    /////////////////////////////////////
    //  Align value by desimal point
    //
    defaultIntegerPadding = 9
    alignValue(value: number, integerPartLen = this.defaultIntegerPadding, desimalPartLen = 7) {
        let [ints, decs] = value.toString().split('.');
        let str = ints.padStart(integerPartLen);
        if (decs) {
            if (decs.length > desimalPartLen) {
                let [, fixed] = value.toFixed(desimalPartLen).split('.');
                decs = fixed.slice(0, desimalPartLen-1) + '~';
            }
            str += '.' + decs;
        }
        return str;
    }

    //////////////////////////////////////////////
    //  Print system sector parameters to string
    //
    async printSystemSector() {
        const cpu = this.cpu
        const systemParameterNames = [
            'ID',
            'Version',
            'Total Memory (bytes)',
            'Data Memory (bytes)',
            'Data Block Table Ref',
            'Data Block Table Length',
            'Data Block Table Last Used ID',
            'Data Block Table Version',
            'Task List Ref',
            'Task List Length'
        ]
        const maxParamNameLength = (systemParameterNames.reduce((a, b) => (a.length > b.length) ? a : b)).length;
        let text = ''
        const addLine = (line: string) => text += (line + '\n');
        
        addLine(this.breakLine);
        addLine(`SYSTEM SECTOR`)
        addLine('')
        
        const systemSector = await cpu.getSystemSector()
        
        Object.keys(systemSector).forEach((key, i) => {
            addLine(`${i.toString().padStart(3)}:  ${systemParameterNames[i].padEnd(maxParamNameLength)}  ${systemSector[key].toString().padStart(6)}`);
        });
        
        addLine('');
        
        this.print(text)
    }


    ///////////////////////////////////////////
    //  Print data block table info to string
    //
    async printDatablockTable() {
        const cpu = this.cpu
        const typeNames = ['UNDEFINED', 'UNALLOCATED', 'TASK', 'CIRCUIT', 'FUNCTION', 'DATA']
        const maxTypeNameLength = (typeNames.reduce((a, b) => (a.length > b.length) ? a : b)).length;

        let text = '';
        const addLine = (line: string) => text += (line + '\n');
        
        const datablockTable = await cpu.getDatablockTable()
        if (!datablockTable) return 'Datablock table to string: Could not read datablock table!'

        addLine(this.breakLine)
        addLine(`DATA BLOCK TABLE (size: ${datablockTable.length})`)
        addLine('')

        await Promise.all(datablockTable.map(async (offset, id) => {
            if (offset) {
                const header = await cpu.getDatablockHeader(id);
                const startAddr = offset.toString(16).toUpperCase()
                const endAddr = (offset + header.byteLength - 1).toString(16).toUpperCase()
                addLine(`${id.toString().padStart(3, '0')}:  ${typeNames[header.type].padEnd(maxTypeNameLength)}  \
${header.byteLength.toString().padStart(6)} bytes  [${startAddr} - ${endAddr}]  ${(header.parentID) ? 'parent: '+header.parentID : ''}`);
            }
        }))
        this.print(text);
    }


    /////////////////////////////////////
    //  Print function block to string
    //
    async printFunctionBlock(funcID: number) {
        const cpu = this.cpu
        const type = (await cpu.getDatablockHeader(funcID)).type;
        if (type != DatablockType.FUNCTION && type != DatablockType.CIRCUIT) return 'Invalid function ID: ' + funcID

        let text = ''
        const addLine = (line: string) => text += (line + '\n');

        const funcBlock = await cpu.getFunctionBlockData(funcID)
        
        const func = (type == DatablockType.FUNCTION) ? instructions.getFunction(funcBlock.library, funcBlock.opcode) : null;
        const funcName = (func) ? instructions.getFunctionName(funcBlock.library, funcBlock.opcode) : 'CIRCUIT';

        const inputRefLen = 6;
        const valueLen = 8;
        const precision = 6;
        const inputNameLen = 9;
        const outputNameLen = 6;
        const rows = Math.max(funcBlock.inputCount, funcBlock.outputCount);

        function printRef(ioRef: IORef): string {
            return (ioRef) ? ioRef.id+':'+ioRef.ioNum : ''
        }

        function ioValue(i: number): string {
            const flags = funcBlock.ioFlags[i];
            const ioType = getIODataType(flags)
            const value = (ioType == IODataType.BINARY || ioType == IODataType.INTEGER)
                        ? funcBlock.ioValues[i].toFixed(0)
                        : funcBlock.ioValues[i].toPrecision(precision);
            
            return (i < funcBlock.inputCount) ? value.padStart(valueLen) : value.padEnd(valueLen);
        }

        addLine(this.breakLine);
        addLine(`${funcID.toString().padStart(3, '0')}:  ${funcName}`)
        addLine('');
        addLine(`${' '.repeat(inputRefLen)}    ${' '.repeat(valueLen)}   _${'_'.repeat(inputNameLen)}${'_'.repeat(outputNameLen)}_`);

        for (let i = 0; i < rows; i++) {
            let hasInput, hasOutput: boolean;
            const connector = (i < funcBlock.inputRefs.length && funcBlock.inputRefs[i]) ? '―>' : '  '
            const inputRef = (i < funcBlock.inputRefs.length && funcBlock.inputRefs[i]) ? printRef(funcBlock.inputRefs[i]).padStart(inputRefLen) : ' '.repeat(inputRefLen);
            const inputValue = (i < funcBlock.inputCount && (hasInput=true)) ? ioValue(i) : ' '.repeat(valueLen);
            const inputName = (i < funcBlock.inputCount) ? (func ? ((i < func.inputs.length && func.inputs[i].name) ? func.inputs[i].name.padEnd(inputNameLen)
                                                                                                                    : ((i == 0) ? funcName.padEnd(inputNameLen)
                                                                                                                                : ' '.repeat(inputNameLen)))
                                                                : i.toString().padEnd(inputNameLen))
                                                        : ' '.repeat(inputNameLen);

            const outNum = i + funcBlock.inputCount;
            const outputName = (i < funcBlock.outputCount) ? (func ? ((i < func.outputs.length && func.outputs[i].name) ? func.outputs[i].name.padStart(outputNameLen)
                                                                                                                        : ' '.repeat(outputNameLen))
                                                                    : i.toString().padStart(outputNameLen))
                                                            : ' '.repeat(outputNameLen);

            const outputValue = (i < funcBlock.outputCount && (hasOutput=true)) ? ioValue(outNum) : ' '.repeat(valueLen);

            const inputPin = hasInput ? (funcBlock.ioFlags[i] & IOFlag.INVERTED ? 'o' : '-') : ' ' 
            const outputPin = hasOutput ? '-' : ' '
            const line = `${inputRef} ${connector} ${inputValue} ${inputPin}| ${inputName}${outputName} |${outputPin} ${outputValue}`
            addLine(line);
        }
        addLine(`${' '.repeat(inputRefLen)}    ${' '.repeat(valueLen)}   ‾${'‾'.repeat(inputNameLen)}${'‾'.repeat(outputNameLen)}‾`);

        if (!func) text += '\n' + await this.getCircuitInfo(funcID);

        this.print(text);
    }

    //////////////////////////////
    //  Print circuit to string
    //
    async getCircuitInfo(circuitID: number) {
        const cpu = this.cpu
        let text = ''
        const addLine = (line: string) => text += (line + '\n');
        const circuit = await cpu.getCircuitData(circuitID);
        if (!circuit) return 'Error'
        addLine(`CALL LIST (size: ${circuit.callIDList.length})`)
        addLine('')
        circuit.callIDList.forEach((funcID, i) => {
            addLine(`${i.toString().padStart(3)}:  ${funcID.toString().padStart(3, '0')}`)
        })
        addLine('')
        addLine(`OUTPUT REFERENCES (size: ${circuit.outputRefs.length})`)
        addLine('')
        circuit.outputRefs.forEach((ref, i) => {
            addLine(`${i.toString().padStart(3)}:  ${(ref) ? ref.id.toString()+':'+ref.ioNum : '-'}`)
        })

        return text;
    }

    async printCircuit(circuitID: number) {
        return await this.getCircuitInfo(circuitID)
    }

    ///////////////////////////
    //  Print task to string
    //
    async printTask(taskID: number) {
        const cpu = this.cpu
        const nameLength = 22

        const names: {[index: string]: [string, (value: number) => string | Promise<string>]} =
        {
            targetRef:   ['Target Ref',             async (value) => `${('0x'+value.toString(16).toUpperCase()).padStart(this.defaultIntegerPadding)}  (ID: ${await cpu.getDatablockID(value)})`],
            interval:    ['Interval (ms)',          (value) => this.alignValue(value)],
            offset:      ['Offset (ms)',            (value) => this.alignValue(value)],
            timeAccu:    ['Time Accumulator (ms)',  (value) => this.alignValue(value)],
            cpuTime:     ['CPU Time desimal (ms)',  (value) => this.alignValue(value)],
            cpuTimeInt:  ['CPU Time Integer (ms)',  (value) => this.alignValue(value)],
            runCount:    ['Run Count',              (value) => this.alignValue(value)],
        }
        
        const task = await cpu.getTask(taskID);
        let text = ''
        const addLine = (line: string) => text += (line + '\n');
        
        addLine(this.breakLine);
        addLine(`${taskID.toString().padStart(3, '0')}:  TASK DATA`)
        addLine('');

        for (const [key, value] of Object.entries(task)) {
            const [name, func] = names[key];
            addLine(`      ${name.padEnd(nameLength)}  ${await func(value)}`);
        }

        const totalCPUtime = task.cpuTimeInt + task.cpuTime;
        const avgCPUtime = totalCPUtime / task.runCount;
        
        addLine('');
        addLine('Calculated:');
        addLine('');
        addLine(`      ${'Total CPU Time (ms)'.padEnd(nameLength)}  ${this.alignValue(totalCPUtime)}`);
        addLine(`      ${'Average CPU Load (ms)'.padEnd(nameLength)}  ${this.alignValue(avgCPUtime)}`);
        this.print(text)
    }
}
