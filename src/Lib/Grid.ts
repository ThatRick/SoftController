import Vec2, {vec2} from './Vector2.js'


export default class Grid<Cell extends Object>
{
    cells: Cell[][] = []        // [y][x]

    setCell(pos: Vec2, cell: Cell) {
        if (this.cells[pos.y] == undefined) this.cells[pos.y] = []
        this.cells[pos.y][pos.x] = cell
    }

    setRect(pos: Vec2, rectRows: Cell[][]) {
        for (let y = 0; y < rectRows.length; y++) {
            if (this.cells[pos.y + y] == undefined) this.cells[pos.y + y] = []
            for (let x = 0; x < rectRows[y].length; x++) {
                this.cells[pos.y + y][pos.x + x] = rectRows[y][x]
            }
        }
    }

    getCell(pos: Vec2) {
        return this.cells[pos.y]?.[pos.x]
    }

    hasCell(pos: Vec2) {
        return (this.getCell(pos) != undefined)
    }

    clearCell(pos: Vec2) {
        if (this.hasCell(pos)) this.cells[pos.y][pos.x] = undefined
    }

    clearRect(pos: Vec2, size: Vec2) {
        for (let y = pos.y; y < pos.y + size.y; y++) {
            if (this.cells[y] == undefined) continue
            for (let x = pos.x; x < pos.x + size.x; x++) {
                this.cells[y][x] = undefined
            }
        }
    }

    rectHasCell(pos: Vec2, size?: Vec2) {
        if (size == undefined) return (this.cells[pos.y][pos.x] != undefined)
        for (let y = pos.y; y < pos.y + size.y; y++) {
            if (this.cells[y] == undefined) continue
            for (let x = pos.x; x < pos.x + size.x; x++) {
                if (this.cells[y][x] != undefined) return true
            }
        }
        return true
    }

    rectHasProps(props: Array<keyof Cell>, pos: Vec2, size?: Vec2) {
        const hasProps = (cell: Cell) => cell && props.some(prop => cell.hasOwnProperty(prop))

        if (size == undefined) return hasProps(this.cells[pos.y][pos.x])
        
        for (let y = pos.y; y < pos.y + size.y; y++) {
            if (this.cells[y] == undefined) continue
            for (let x = pos.x; x < pos.x + size.x; x++) {
                if (hasProps(this.cells[y][x])) return true
            }
        }
        return true
    }

    deleteCell(pos: Vec2) {
        if (this.hasCell(pos)) delete this.cells[pos.y][pos.x]
    }

    getRowLength(rowIndex: number) {
        return this.cells[rowIndex]?.length
    }

    get size() {
        const width = this.cells.reduce<number>((maxWidth: number, row) => Math.max(row.length, maxWidth), 0)
        const height = this.cells.length
        return vec2(width, height)
    }
}