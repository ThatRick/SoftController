
export function domElement<K extends keyof HTMLElementTagNameMap>(parentDOM: HTMLElement, tagName: K, style?: Partial<CSSStyleDeclaration>): HTMLElementTagNameMap[K] {
    const elem = document.createElement(tagName)
    Object.assign(elem.style, style)
    parentDOM?.appendChild(elem)
    return elem
}

type TableCellIterator = (cell: HTMLTableCellElement, row: number, col: number) => void

export class Button
{
    elem: HTMLDivElement
    constructor(parentElement: HTMLElement, text: string, charWidth: number, action: () => void) {
        this.elem = domElement(parentElement, 'div', {
            color: 'white',
            margin: '2px',
            backgroundColor: '#557',
            border: '1px solid #779',
            width: text.length * charWidth + 'px',
            borderRadius: '10%',
            fontSize: '1em',
            fontFamily: 'monospace',
            textAlign: 'center',
            display: 'inline-block',
            userSelect: 'none',
            cursor: 'pointer'
        })
        this.elem.textContent = text
        this.elem.onpointerenter = ev => this.elem.style.backgroundColor = '#779'
        this.elem.onpointerleave = ev => this.elem.style.backgroundColor = '#557'
        this.elem.onclick = (ev) => {
            this.elem.style.backgroundColor = '#99A'
            setTimeout(() => {
                this.elem.style.backgroundColor = '#557'
            }, 30)
            action()
        }
    }

}

export class Table
{
    table: HTMLTableElement
    rows: HTMLTableRowElement[] = []
    cells: HTMLTableCellElement[][] = []

    constructor (options: {
        rows: number,
        columns: number,
        parentElement?: HTMLElement,
        tableStyle?: Partial<CSSStyleDeclaration>,
        rowStyle?:   Partial<CSSStyleDeclaration>,
        cellStyle?:  Partial<CSSStyleDeclaration>,
        cellIterator?: TableCellIterator
    }) 
    {
        this.table = domElement(options.parentElement, 'table', options.tableStyle)

        for (let y = 0; y < options.rows; y++) {
            const row = domElement(this.table, 'tr', options.rowStyle)
            this.rows[y] = row
            this.cells[y] = []
            for (let x = 0; x < options.columns; x++) {
                const cell = domElement(row, 'td', options.cellStyle)
                this.cells[y][x] = cell
            }
        }
        if (options.cellIterator) this.iterateCells(options.cellIterator)
    }

    getCell(row: number, col: number) { return this.cells[row][col] }

    iterateCells(iterator: TableCellIterator) {
        this.cells.forEach((row, y) => row.forEach((cell, x) => iterator(cell, y, x)))
    }
}