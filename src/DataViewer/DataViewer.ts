import { htmlElement, HTMLTable } from './HTML.js'

const config =
{
    bytesPerRow:    16,
    addressLength:  6,
    selectionColor: '#CEF',
    modifiedColor:  '#FFC',
    modifiedSelectionColor: '#CFC',
    maxDataSize:    32 * 1024,
    padding:        '5px',
    appName:        'WebHex.io'
}

interface DataType {
    name:   string
    size:   number
}
const dataTypes: DataType[] = [
    { name: 'Uint8',     size: 1 },
    { name: 'Uint16',    size: 2 },
    { name: 'Uint32',    size: 4 },
    { name: 'BigUint64', size: 8 },
    { name: 'Int8',      size: 1 },
    { name: 'Int16',     size: 2 },
    { name: 'Int32',     size: 4 },
    { name: 'BigInt64',  size: 8 },
    { name: 'Float32',   size: 4 },
    { name: 'Float64',   size: 8 },
]

const mimeTypeBinary = 'application/octet-stream'

export class DataTable
{
    private table: HTMLTable

    private selectionOffset: number
    private selectionDataType: DataType = dataTypes[0]
    private selectionValue: number
    private selectionLittleEndian: boolean = true

    private columIndex = {
        address: 0,
        value: [...Array(config.bytesPerRow)].map((_, i) => i + 1),
        ascii: [...Array(config.bytesPerRow)].map((_, i) => i + 1 + config.bytesPerRow)
    }
    private byteValueCells = new Map<number, HTMLTableCellElement>()
    private byteAsciiCells = new Map<number, HTMLTableCellElement>()
    private modifiedBytes =  new Set<number>()

    private bytes: Uint8Array
    private dataView: DataView

    getSelectionValue() { return this.selectionValue }

    setSelectionValue(value: number) {
        if (value == this.selectionValue) return
        const prevBytes = this.bytes.slice(this.selectionOffset, this.selectionOffset + this.selectionDataType.size)
        const setter = 'set' + this.selectionDataType.name
        this.dataView[setter](this.selectionOffset, value, this.selectionLittleEndian)

        for (let i = this.selectionOffset; i < this.selectionOffset + this.selectionDataType.size; i++) {
            const byteValue = this.bytes[i]
            const prevValue = prevBytes[i - this.selectionOffset]
            if (byteValue == prevValue) continue
            this.modifiedBytes.add(i)
            this.byteValueCells.get(i).textContent = byteValue.toString(16).padStart(2, '0')
            this.byteAsciiCells.get(i).textContent = (byteValue > 31 && byteValue < 127) ? String.fromCharCode(byteValue) : '.'
        }
        this.updateSelection()
    }

    setSelectionType(typeIndex: number ) {
        this.clearSelection()
        this.selectionDataType = dataTypes[typeIndex]
        this.updateSelection()
    }

    setSelectionOffset(offset: number) {
        this.clearSelection()
        this.selectionOffset = offset
        this.updateSelection()
        this.onSelectionOffsetChanged?.(this.selectionOffset)
    }

    setEndianess(littleEndian: boolean) {
        this.selectionLittleEndian = littleEndian
        this.updateSelection()
    }

    onSelectionOffsetChanged: (offset: number) => void
    onSelectionValueChanged: (value: number) => void
    
    keyDown(ev: KeyboardEvent) {
        switch(ev.key) {
            case 'ArrowLeft':
                if (this.selectionOffset > 0) this.setSelectionOffset(this.selectionOffset - 1)
                ev.preventDefault()
                break
            case 'ArrowRight':
                if (this.selectionOffset < this.bytes.length-1) this.setSelectionOffset(this.selectionOffset + 1)
                ev.preventDefault()
                break
            case 'ArrowUp':
                if (this.selectionOffset >= config.bytesPerRow) this.setSelectionOffset(this.selectionOffset - config.bytesPerRow)
                ev.preventDefault()
                break
            case 'ArrowDown':
                if (this.selectionOffset < this.bytes.length - config.bytesPerRow) this.setSelectionOffset(this.selectionOffset + config.bytesPerRow)
                ev.preventDefault()
                break
        }
    }

    private clearSelection() {
        if (this.selectionOffset === undefined) return
        for (let i = this.selectionOffset; i < this.selectionOffset + this.selectionDataType.size; i++) {
            const isModified = this.modifiedBytes.has(i)
            const valueCell = this.byteValueCells.get(i)
            const asciiCell = this.byteAsciiCells.get(i)
            valueCell.style.backgroundColor = isModified ? config.modifiedColor : 'transparent'
            asciiCell.style.backgroundColor = isModified ? config.modifiedColor : 'transparent'
            asciiCell.style.fontWeight = 'normal'
        }
    }
    private updateSelection() {
        const getter = 'get' + this.selectionDataType.name
        this.selectionValue = this.dataView[getter](this.selectionOffset, this.selectionLittleEndian)
        this.onSelectionValueChanged?.(this.selectionValue)

        for (let i = this.selectionOffset; i < this.selectionOffset + this.selectionDataType.size; i++) {
            const isModified = this.modifiedBytes.has(i)
            const valueCell = this.byteValueCells.get(i)
            const asciiCell = this.byteAsciiCells.get(i)
            valueCell.style.backgroundColor = isModified ? config.modifiedSelectionColor : config.selectionColor
            asciiCell.style.backgroundColor = isModified ? config.modifiedSelectionColor : config.selectionColor
            asciiCell.style.fontWeight = 'bolder'
        }
    }

    constructor(data: ArrayBuffer)
    {
        this.dataView = new DataView(data)
        this.bytes = new Uint8Array(data)

        const rowCount = Math.ceil(data.byteLength / config.bytesPerRow)
        const columnCount = 1 + config.bytesPerRow + config.bytesPerRow

        this.table = new HTMLTable({
            rows:       rowCount,
            columns:    columnCount,
        })

        for (let row = 0; row < rowCount; row++) {
            const byteOffset = row * config.bytesPerRow
            // Address column
            const addressCell = this.table.getCell(row, this.columIndex.address)
            addressCell.textContent = byteOffset.toString().padStart(config.addressLength, '0')

            for (let i = 0; i < config.bytesPerRow; i++) {
                const byteIndex = byteOffset + i
                if (byteIndex >= this.bytes.length) break
                const byteValue = this.bytes[byteIndex]
                // Byte numeric values
                const byteValueCell = this.table.getCell(row, this.columIndex.value[i])
                byteValueCell.textContent = byteValue.toString(16).padStart(2, '0')
                byteValueCell.dataset.byteIndex = byteIndex.toString()
                byteValueCell.dataset.cellType = 'byteValue'
                this.byteValueCells.set(byteIndex, byteValueCell)
                // Byte ascii values
                const byteAsciiCell = this.table.getCell(row, this.columIndex.ascii[i])
                byteAsciiCell.textContent = (byteValue > 31 && byteValue < 127) ? String.fromCharCode(byteValue) : '.'
                byteAsciiCell.dataset.byteIndex = byteIndex.toString()
                byteAsciiCell.dataset.cellType = 'byteAscii'
                this.byteAsciiCells.set(byteIndex, byteAsciiCell)
            }
        }

        // Add spacing to first row address cell
        this.table.getCell(0, 0).style.paddingRight = config.padding
        // and every fourth value cells
        const rowDataLength = Math.min(config.bytesPerRow, this.bytes.length)
        for (let i = 3; i < rowDataLength; i += 4) {
            this.byteValueCells.get(i).style.paddingRight = config.padding
        }

        this.table.element.onclick = (ev: MouseEvent) => {
            const target = ev.target as HTMLElement
            if (target.dataset.byteIndex) {
                const byteIndex = parseInt(target.dataset.byteIndex)
                console.log(byteIndex)
                this.setSelectionOffset(byteIndex)
            }
        }
    }

    get element() { return this.table.element }
}

export class DataViewer
{
    private dataBuffer: ArrayBuffer
    private root: HTMLDivElement
    private header: {
        root:   HTMLDivElement
        title:  HTMLSpanElement
        open:   HTMLButtonElement
        save:   HTMLButtonElement
        selectionOffset:    HTMLSpanElement
        selectionValue:     HTMLInputElement
        selectionType:      HTMLSelectElement
        selectionEndianess: HTMLSelectElement
        selectionBase:      HTMLSelectElement
    }
    private content: HTMLDivElement
    private dataTable: DataTable
    private base16 = false
    private fileName: string

    constructor(parent: HTMLElement)
    {
        this.root = htmlElement('div', {
            style: {
                whiteSpace: 'pre',
                fontFamily: 'monospace',
            },
            parent: parent
        })

        const headerRoot = htmlElement('div', {
            style: {
                backgroundColor: '#CCC',
                position: 'fixed',
                left: '0px', top: '0px',
                padding: '0.5em',
                width: '100%',
                height: '2em'
            },
            parent: this.root,
            setup: (elem) => {
                elem.ondragover = (ev: DragEvent) => ev.preventDefault()
                elem.ondrop = (ev: DragEvent) => this.openFile(ev)
            }
        })

        this.header = {
            root: headerRoot,
            title: htmlElement('span', {
                textContent: config.appName + ' - example data',
                style: { paddingRight: '1em' },
                parent: headerRoot
            }),
            open: htmlElement('button', {
                textContent: 'Open',
                parent: headerRoot,
                setup: elem => {
                    elem.onclick = () => console.log('Open pressed.')
                }
            }),
            save: htmlElement('button', {
                textContent: 'Save',
                parent: headerRoot,
                setup: elem => {
                    elem.onclick = () => this.saveFile()
                }
            }),
            selectionOffset: htmlElement('span', {
                textContent: '['+ ''.padStart(config.addressLength, '-') +']:',
                style: { paddingLeft: config.padding, },
                parent: headerRoot
            }),
            selectionValue: htmlElement('input', {
                setup: elem => {
                    elem.onkeydown = (ev: KeyboardEvent) => {
                        if (ev.key == 'Enter') {
                            const value = Number(elem.value)
                            if (Number.isNaN(value)) return
                            this.setSelectionValue(value)
                            this.dataTable.setSelectionValue(value)
                        }
                    }
                },
                style: { paddingLeft: config.padding, paddingRight: config.padding },
                parent: headerRoot
            }),
            selectionType: htmlElement('select', {
                setup: elem => {
                    dataTypes.forEach((dataType, i) => htmlElement('option', {
                        setup: elem => elem.value = i.toString(),
                        textContent: dataType.name,
                        parent: elem
                    }))
                    elem.onchange = ev => this.dataTable?.setSelectionType(parseInt(elem.value))
                },
                parent: headerRoot
            }),
            selectionEndianess: htmlElement('select', {
                setup: elem => {
                    ['little endian', 'big endian'].forEach(endianess => htmlElement('option', {
                        setup: elem => elem.value = endianess,
                        textContent: endianess,
                        parent: elem
                    }))
                    elem.onchange = ev => this.dataTable?.setEndianess(elem.value == 'little endian' ? true : false)
                },
                parent: headerRoot
            }),
            selectionBase: htmlElement('select', {
                setup: elem => {
                    ['dec', 'hex'].forEach(base => htmlElement('option', {
                        setup: elem => elem.value = base,
                        textContent: base,
                        parent: elem
                    }))
                    elem.onchange = ev => {
                        this.base16 = elem.value == 'hex' ? true : false
                        const value = this.dataTable.getSelectionValue()
                        this.setSelectionValue(value)
                    }
                },
                parent: headerRoot
            })
        }
        
        const verticalSpacer = htmlElement('div', {
            style: { height: headerRoot.clientHeight + 'px' },
            parent: this.root
        })

        this.content = htmlElement('div', {
            parent: this.root,
            setup: elem => elem.tabIndex = -1
        })
    }

    openFile(ev: DragEvent) {
        console.log('Dropped')
        ev.preventDefault()
        console.log(ev.dataTransfer.files)
        const file = ev.dataTransfer.files[0]
        console.log(file.name)
        this.fileName = file.name
        this.header.title.textContent = config.appName + ' - ' + file.name
        const reader = new FileReader()
        reader.onload = ev => {
            const data = ev.target.result as ArrayBuffer
            this.setData(data.slice(0, config.maxDataSize))
        }
        reader.readAsArrayBuffer(file)
    }

    saveFile() {
        const blob = new Blob([this.dataBuffer], { type: mimeTypeBinary })
        const url = URL.createObjectURL(blob)
        const anchor = htmlElement('a', {
            style: { display: 'none' },
            parent: document.body,
            setup: elem => {
                elem.href = url
                elem.download = this.fileName ?? 'example.bin'
                elem.type = mimeTypeBinary
            }
        })
        anchor.click()
        URL.revokeObjectURL(url)
        anchor.remove()
    }

    setSelectionValue = (value: number) => {
        this.header.selectionValue.value = this.base16 ? '0x' + value.toString(16) : value.toString()
    }

    setData(data?: ArrayBuffer) {
        this.dataBuffer = data
        if (this.dataTable) {
            this.content.removeChild(this.dataTable.element)
        }
        this.dataTable = new DataTable(data)

        this.dataTable.onSelectionOffsetChanged = offset => {
            this.header.selectionOffset.textContent = '[' + offset.toString().padStart(config.addressLength, '0') + ']:'
        }
        this.dataTable.onSelectionValueChanged = this.setSelectionValue

        this.content.appendChild(this.dataTable.element)

        this.content.onkeydown = ev => {
            console.log('Key down:', ev.key)
            this.dataTable.keyDown(ev)
        }
    }
}