
export function domElement<K extends keyof HTMLElementTagNameMap>(parentDOM: HTMLElement, tagName: K, style?: Partial<CSSStyleDeclaration>): HTMLElementTagNameMap[K] {
    const elem = document.createElement(tagName)
    Object.assign(elem.style, style)
    parentDOM?.appendChild(elem)
    return elem
}

type TableCellIterator = (cell: HTMLTableCellElement, row: number, col: number) => void

export class Text {
    DOMElement: HTMLDivElement
    constructor (text: string, style?: Partial<CSSStyleDeclaration>) {
        this.DOMElement = domElement(null, 'div', {
            display: 'inline-block',
            paddingLeft: '2px',
            paddingRight: '2px',
            ...style
        })
        this.DOMElement.textContent = text
    }
}

export abstract class ButtonBase
{
    DOMElement: HTMLDivElement
    onClick?: (ev: MouseEvent) => void
    onDown?: (ev: PointerEvent) => void
    onUp?: (ev: PointerEvent) => void

    color = {
        base:    '#557',
        light:   '#779',
        active:  '#99A'
    }

    backgroundColor = this.color.base

    constructor(text: string, charWidth = 9) {
        this.DOMElement = domElement(null, 'div', {
            color: 'white',
            margin: '2px',
            paddingLeft: '2px',
            paddingRight: '2px',
            backgroundColor: this.backgroundColor,
            border: '1px solid ' + this.color.light,
            //width: text.length * charWidth + 'px',
            borderRadius: '2px',
            textAlign: 'center',
            display: 'inline-block',
            userSelect: 'none',
            cursor: 'pointer'
        })
        this.DOMElement.textContent = text

        this.DOMElement.onpointerenter = ev => this.DOMElement.style.backgroundColor = this.color.light
        this.DOMElement.onpointerleave = ev => this.DOMElement.style.backgroundColor = this.backgroundColor
        
        this.DOMElement.onclick = ev => this.onClick?.(ev)
        this.DOMElement.onpointerdown = ev => this.onDown?.(ev)
        this.DOMElement.onpointerup = ev => this.onUp?.(ev)
    }

    flash(color: string) {
        this.DOMElement.style.backgroundColor = color
        setTimeout(() => {
            this.DOMElement.style.backgroundColor = this.backgroundColor
        }, 30)
    }
}

export class Button extends ButtonBase
{
    constructor(text: string, action: () => void) {
        super(text)

        this.onClick = () => {
            this.flash(this.color.active)
            action()
        }
    }
}

export class ToggleButton extends ButtonBase
{
    state: boolean
    colors: []
    constructor(text: string, toggle: (state: boolean) => boolean, initState=false) {
        super(text)
        this.state = initState

        this.onClick = () => {
            this.state = toggle(!this.state)
            this.backgroundColor = this.state ? this.color.light : this.color.base
            this.flash(this.color.active)
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