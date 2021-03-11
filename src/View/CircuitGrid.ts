import CircuitView from './CircuitView.js'
import Grid from '../Lib/Grid.js'
import Vec2, { vec2 } from '../Lib/Vector2.js'
import { TraceRoute } from './TraceLayer.js'
import FunctionBlockView from './FunctionBlockView.js'
import { TraceLine } from './TraceLine.js'
import * as HTML from '../Lib/HTML.js'

const DEBUG = true

export const enum CellType
{
    Block,
    Trace,
}

interface FunctionBlockCell
{ 
    type: CellType.Block
    elem: FunctionBlockView
}

interface TraceCell
{
    type: CellType.Trace
    elem: TraceLine
    direction: 'horizontal' | 'vertical' | 'corner'
}

export type Cell = 
    | FunctionBlockCell
    | TraceCell


export type Collision =
{
    type: 'cross' | 'joint' | 'overlap trace'
    target: TraceLine
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
    visualMap: HTMLCanvasElement
    ctx: CanvasRenderingContext2D
    constructor(protected circuit: CircuitView)
    {
        this.visualMap = HTML.domElement(circuit.DOMElement, 'canvas', {
            position: 'absolute',
            width: '100%',
            height: '100%',
            imageRendering: 'pixelated'
        })
        this.visualMap.width = circuit.size.x
        this.visualMap.height = circuit.size.y
        this.ctx = this.visualMap.getContext('2d')
    }
    
    resize() {
        this.visualMap.width = this.circuit.size.x
        this.visualMap.height = this.circuit.size.y
        this.visualize()
    }

    protected visualize() {
        if (!this.grid) return
        
        const lineColors = {
            horizontal:     '#080',
            vertical:       '#008',
            corner:         '#044',
        }
        const blockColor =  '#404'
        const collisionColors = {
            'cross':            '#000',
            'joint':            '#880',
            'overlap trace':    '#800',
            'overlap block':    '#622',
        }

        this.ctx.clearRect(0, 0, this.visualMap.width, this.visualMap.height)

        this.grid.cells.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell) {
                    const color = (cell.type == CellType.Block) ? blockColor
                                : lineColors[cell.direction]
                    
                    this.ctx.fillStyle = color
                    this.ctx.fillRect(x, y, 1, 1)
                }
            })
        })

        this.circuit.traceLines.forEach(traceLine => {
            traceLine.route.collisions.forEach(collision => {
                const {type, pos} = collision
                const color = collisionColors[type]
                this.ctx.fillStyle = color
                this.ctx.fillRect(pos.x, pos.y, 1, 1)
            })
            
        })
    }

    update() {
        this.grid = new Grid<Cell>()

        // Map function blocks
        this.circuit.blockViews.forEach(block => {
            this.grid.fillRect(block.pos, block.size, { type: CellType.Block, elem: block })
        })
        // Map horizontal line segments
        this.circuit.traceLines.forEach(traceLine => {
            traceLine.route.collisions = []
            const points = traceLine.route.points
            const cell: Cell = { type: CellType.Trace, elem: traceLine, direction: 'horizontal' }
    
            for (let i = 1; i < points.length; i += 2)
            {
                // Map horizontal line
                const results = this.mapHorizontalLine(points[i-1], points[i], cell, i)
                
                // If no collision, mark corners
                if (results.length == 0 && (i == 3 || i == 5)) {
                    this.grid.setCell(points[i-1], { type: CellType.Trace, elem: traceLine, direction: 'corner' })
                }
                if (results.length == 0 && (i == 1 || i == 3 && points.length == 6)) {
                    this.grid.setCell(points[i], { type: CellType.Trace, elem: traceLine, direction: 'corner' })
                }
                traceLine.route.collisions.push(...results)
            }
        })
        // Map vertical line segments
        this.circuit.traceLines.forEach(traceLine => {
            const points = traceLine.route.points
            const cell: Cell = { type: CellType.Trace, elem: traceLine, direction: 'vertical' }
    
            for (let i = 2; i < points.length-1; i += 2)
            {
                // Map vertical line
                const results = this.mapVerticalLine(points[i-1], points[i], cell, i)
                traceLine.route.collisions.push(...results)
            }
        })
        
        this.visualize()
    }

    protected mapHorizontalLine(a: Vec2, b: Vec2, cell: TraceCell, pointNum: number) {
        const collisions: Collision[] = []
        console.assert(a.y == b.y, 'Invalid points for horizontal line:', a, b)
        const y = a.y
        this.grid.cells[y] ??= []
        if (a.x < b.x) {
            for (let x = a.x; x <= b.x; x++) {
                const collision = this.mapHorizontalLineCell(x, y, cell, pointNum)
                if (collision) collisions.push(collision)
            }
        }
        else {
            for (let x = a.x; x >= b.x; x--) {
                const collision = this.mapHorizontalLineCell(x, y, cell, pointNum)
                if (collision) collisions.push(collision)
            }            
        }
        return collisions
    }
    protected mapHorizontalLineCell(x: number, y: number, cell: TraceCell, pointNum: number): Collision {
        DEBUG && console.info('map horizontal line cell', x, y)
        const target = this.grid.cells[y][x]
        // Collide with another line
        if (target?.type == CellType.Trace)
        {
            const targetHasCommonSource = (target.elem.sourcePinView == cell.elem.sourcePinView)
            return {
                type: (targetHasCommonSource) ? 'joint' : 'overlap trace',
                target: target.elem,
                point: pointNum,
                pos: vec2(x, y),
            }
        }
        // Collide with block
        else if (target?.type == CellType.Block) {
            return {
                type: 'overlap block',
                target: target.elem,
                point: pointNum,
                pos: vec2(x, y),
            }
        }
        else this.grid.cells[y][x] = cell
    }

    protected mapVerticalLine(a: Vec2, b: Vec2, cell: TraceCell, pointNum: number) {
        const collisions: Collision[] = []
        console.assert(a.x == b.x, 'Invalid points for vertical line:', a, b)
        const x = a.x
        if (Math.abs(a.y - b.y) < 2) return []
        if (a.y < b.y) {
            for (let y = a.y + 1; y < b.y; y++) {
                this.grid.cells[y] ??= []
                const collision = this.mapVerticalLineCell(x, y, cell, pointNum)
                if (collision) collisions.push(collision)
            }
        } else {
            for (let y = a.y - 1; y > b.y; y--) {
                this.grid.cells[y] ??= []
                const collision = this.mapVerticalLineCell(x, y, cell, pointNum)
                if (collision) collisions.push(collision)
            }
        }
        return collisions
    }

    protected mapVerticalLineCell(x: number, y: number, cell: TraceCell, pointNum: number): Collision {
        DEBUG && console.info('map vertical line cell', x, y)
        const target = this.grid.cells[y][x]
        // Collide with another line
        if (target?.type == CellType.Trace)
        {
            const targetHasCommonSource = (target.elem.sourcePinView == cell.elem.sourcePinView)
            const targetIsHorizontal = (target.direction == 'horizontal')
            const type = (targetHasCommonSource) ? 'joint'
                       : (targetIsHorizontal) ? 'cross'
                       : 'overlap trace'
            return {
                type,
                target: target.elem,
                point: pointNum,
                pos: vec2(x, y),
            }
        }
        // Collide with block
        else if (target?.type == CellType.Block) {
            return {
                type: 'overlap block',
                target: target.elem,
                point: pointNum,
                pos: vec2(x, y),
            }
        }
        else this.grid.cells[y][x] = cell
    }
}