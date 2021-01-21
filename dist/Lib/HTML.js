export function domElement(parentDOM, tagName, style) {
    const elem = document.createElement(tagName);
    Object.assign(elem.style, style);
    parentDOM?.appendChild(elem);
    return elem;
}
export class ButtonBase {
    constructor(parentElement, text, charWidth = 9) {
        this.color = {
            base: '#557',
            light: '#779',
            active: '#99A'
        };
        this.backgroundColor = this.color.base;
        this.elem = domElement(parentElement, 'div', {
            color: 'white',
            margin: '2px',
            backgroundColor: this.backgroundColor,
            border: '1px solid ' + this.color.light,
            width: text.length * charWidth + 'px',
            borderRadius: '10%',
            fontSize: '1em',
            fontFamily: 'monospace',
            textAlign: 'center',
            display: 'inline-block',
            userSelect: 'none',
            cursor: 'pointer'
        });
        this.elem.textContent = text;
        this.elem.onpointerenter = ev => this.elem.style.backgroundColor = this.color.light;
        this.elem.onpointerleave = ev => this.elem.style.backgroundColor = this.backgroundColor;
        this.elem.onclick = ev => this.onClick?.(ev);
        this.elem.onpointerdown = ev => this.onDown?.(ev);
        this.elem.onpointerup = ev => this.onUp?.(ev);
    }
    flash(color) {
        this.elem.style.backgroundColor = color;
        setTimeout(() => {
            this.elem.style.backgroundColor = this.backgroundColor;
        }, 30);
    }
}
export class Button extends ButtonBase {
    constructor(parentElement, text, action) {
        super(parentElement, text);
        this.onClick = () => {
            this.flash(this.color.active);
            action();
        };
    }
}
export class ToggleButton extends ButtonBase {
    constructor(parentElement, text, toggle, initState = false) {
        super(parentElement, text);
        this.state = initState;
        this.onClick = () => {
            this.state = toggle(!this.state);
            this.backgroundColor = this.state ? this.color.light : this.color.base;
            this.flash(this.color.active);
        };
    }
}
export class Table {
    constructor(options) {
        this.rows = [];
        this.cells = [];
        this.table = domElement(options.parentElement, 'table', options.tableStyle);
        for (let y = 0; y < options.rows; y++) {
            const row = domElement(this.table, 'tr', options.rowStyle);
            this.rows[y] = row;
            this.cells[y] = [];
            for (let x = 0; x < options.columns; x++) {
                const cell = domElement(row, 'td', options.cellStyle);
                this.cells[y][x] = cell;
            }
        }
        if (options.cellIterator)
            this.iterateCells(options.cellIterator);
    }
    getCell(row, col) { return this.cells[row][col]; }
    iterateCells(iterator) {
        this.cells.forEach((row, y) => row.forEach((cell, x) => iterator(cell, y, x)));
    }
}
