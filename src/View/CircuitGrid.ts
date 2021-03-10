import CircuitView from './CircuitView.js'
import Grid from '../Lib/Grid.js'
import Vec2, { vec2 } from '../Lib/Vector2.js'
import { TraceRoute } from './TraceLayer.js'
import FunctionBlockView from './FunctionBlockView.js'

export const enum CellType
{
    Block,
    TraceVertical,
    TraceHorizontal,
    TraceCorner,
}

export type Cell = 
| { type: CellType.Block, elem: FunctionBlockView }
| { type: CellType.TraceVertical, elem: TraceRoute }
| { type: CellType.TraceHorizontal, elem: TraceRoute }
| { type: CellType.TraceCorner, elem: TraceRoute }

export type Collision =
{
    type: 'cross' | 'joint' | 'overlap trace'
    target: TraceRoute
    point: number
    pos: Vec2
} | {
    type: 'overlap block'
    target: FunctionBlockView
    point: number
    pos: Vec2
}

export default class CircuitGrid
{
    grid: Grid<Cell>
    
    constructor(protected circuit: CircuitView) {
    }

    update() {
        const grid = new Grid<Cell>()

        this.circuit.blockViews.forEach(block => {
            grid.fillRect(block.pos, block.size, { type: CellType.Block, elem: block })
        })
        this.circuit.traceLayer.traces.forEach(trace => {
            const points = trace.points
            for (let i=1; i<points.length; i++) {
                (i % 2 == 0)
                    ? grid.fillVerticalLine(points[i-1], points[i], { type: CellType.TraceVertical, elem: trace })
                    : grid.fillHorizontalLine(points[i-1], points[i], { type: CellType.TraceHorizontal, elem: trace })
                if (i < points.length - 1) {
                    grid.setCell(points[i], { type: CellType.TraceCorner, elem: trace })
                }
            }
        })
    }

    mapHorizontalLine(a: Vec2, b: Vec2, value: Cell, pointNum: number) {
        const results: Collision[] = []
        console.assert(a.y == b.y, 'Invalid points for horizontal line:', a, b)
        const y = a.y
        this.grid.cells[y] ??= []
        if (a.x < b.x) {
            for (let x = a.x; x < b.x; x++) {
                const collision = this.checkHorizontalLineCell(x, y, pointNum)
                if (collision) results.push(collision)
                else this.grid.cells[y][x] = value
            }
        }
        else {
            for (let x = a.x; x > b.x; x--) {
                const collision = this.checkHorizontalLineCell(x, y, pointNum)
                if (collision) results.push(collision)
                else this.grid.cells[y][x] = value
            }            
        }
        return results
    }
    checkHorizontalLineCell(x: number, y: number, pointNum: number): Collision {
        const cell = this.grid.cells[y][x]
        if (cell && (cell.type == CellType.TraceHorizontal || cell.type == CellType.TraceCorner )) {
            // Overlapping horizontal line
            return {
                type: 'overlap trace',
                target: cell.elem,
                point: pointNum,
                pos: vec2(x, y),
            }
        }
        else if (cell && cell.type == CellType.Block) {
            // Overlapping block
            return {
                type: 'overlap block',
                target: cell.elem,
                point: pointNum,
                pos: vec2(x, y),
            }
        }
    }

    mapVerticalLine(a: Vec2, b: Vec2, value: Cell, pointNum: number) {
        const results: Collision[] = []
        console.assert(a.x == b.x, 'Invalid points for vertical line:', a, b)
        const x = a.x
        if (a.y < b.y) {
            for (let y = a.y; y < b.y; y++) {
                this.grid.cells[y] ??= []
                const collision = this.checkVerticalLineCell(x, y, pointNum)
                if (collision) results.push(collision)
                else this.grid.cells[y][x] = value    
                this.grid.cells[y][a.x] = value
            }
        } else {

        }
    }
    checkVerticalLineCell(x: number, y: number, pointNum: number): Collision {
        const cell = this.grid.cells[y][x]
        if (cell && (cell.type == CellType.TraceHorizontal || cell.type == CellType.TraceCorner )) {
            // Overlapping horizontal line
            return {
                type: 'overlap trace',
                target: cell.elem,
                point: pointNum,
                pos: vec2(x, y),
            }
        }
        else if (cell && cell.type == CellType.Block) {
            // Overlapping block
            return {
                type: 'overlap block',
                target: cell.elem,
                point: pointNum,
                pos: vec2(x, y),
            }
        }
    }


}