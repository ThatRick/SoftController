export function domElement(parentDOM, tagName, style) {
    const elem = document.createElement(tagName);
    Object.assign(elem.style, style);
    parentDOM?.appendChild(elem);
    return elem;
}
export class Text {
    constructor(text, style) {
        this.DOMElement = domElement(null, 'div', {
            display: 'inline-block',
            paddingLeft: '2px',
            paddingRight: '2px',
            ...style
        });
        this.DOMElement.textContent = text;
    }
}
export class ButtonBase {
    constructor(text, charWidth = 9) {
        this.color = {
            base: '#447',
            light: '#66A',
            active: '#77D'
        };
        this.backgroundColor = this.color.base;
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
        });
        this.DOMElement.textContent = text;
        this.DOMElement.onpointerenter = ev => this.DOMElement.style.backgroundColor = this.color.light;
        this.DOMElement.onpointerleave = ev => this.DOMElement.style.backgroundColor = this.backgroundColor;
        this.DOMElement.onclick = ev => this.onClick?.(ev);
        this.DOMElement.onpointerdown = ev => this.onDown?.(ev);
        this.DOMElement.onpointerup = ev => this.onUp?.(ev);
    }
    flash(color) {
        this.DOMElement.style.backgroundColor = color;
        setTimeout(() => {
            this.DOMElement.style.backgroundColor = this.backgroundColor;
        }, 30);
    }
}
export class Button extends ButtonBase {
    constructor(text, action) {
        super(text);
        this.onClick = () => {
            this.flash(this.color.active);
            action();
        };
    }
}
export class ToggleButton extends ButtonBase {
    constructor(text, toggle, initState = false) {
        super(text);
        this.state = initState;
        this.onClick = () => {
            this.state = toggle(!this.state);
            this.backgroundColor = this.state ? this.color.light : this.color.base;
            this.DOMElement.style.borderColor = this.state ? 'white' : this.color.light;
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
