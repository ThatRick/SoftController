import CircuitView from './CircuitView.js'
import Grid from '../Lib/Grid.js'
import Vec2, { vec2 } from '../Lib/Vector2.js'
import { TraceRoute } from './TraceLayer.js'
import FunctionBlockView from './FunctionBlockView.js'
import { TraceLine } from './TraceLine.js'
import * as HTML from '../Lib/HTML.js'

const DEBUG = false

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


type CollisionType = 'crossing' | 'joint' | 'overlap trace' | 'overlap block'

export type Collision =
{
    type: 'crossing' | 'joint' | 'overlap trace'
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
            'crossing':            '#000',
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

        // Find trace joints to trim traces
        this.circuit.traceLines.forEach(traceLine => {
            traceLine.route.collisions = []
            const points = traceLine.route.points
            
            const horizontalCell: Cell = { type: CellType.Trace, elem: traceLine, direction: 'horizontal' }
            const verticalCell: Cell = { type: CellType.Trace, elem: traceLine, direction: 'vertical' }

            traceLine.route.trimmedPoints = [...points]
            // Odd: horizontal, Even: vertical
            for (let i = 1; i < points.length; i++) {
                const [jointCollision] = (i % 2 == 0)
                    ? this.mapVerticalLine(points[i-1], points[i], verticalCell, i, ['joint'])
                    : this.mapHorizontalLine(points[i-1], points[i], horizontalCell, i, ['joint'])
                
                // If joint found
                if (jointCollision?.type == 'joint') {
                    traceLine.route.collisions.push()
                    traceLine.route.trimmedPoints = [...points.slice(0, jointCollision.point), vec2(jointCollision.pos)]
                    break
                }
            }
        })

        // Map horizontal line segments
        this.circuit.traceLines.forEach(traceLine => {
            traceLine.route.collisions = []
            const points = traceLine.route.trimmedPoints
            const cell: Cell = { type: CellType.Trace, elem: traceLine, direction: 'horizontal' }
    
            for (let i = 1; i < points.length; i += 2)
            {
                // Map horizontal line
                const results = this.mapHorizontalLine(points[i-1], points[i], cell, i, ['crossing', 'overlap trace', 'overlap block'])
                
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
            const points = traceLine.route.trimmedPoints
            const cell: Cell = { type: CellType.Trace, elem: traceLine, direction: 'vertical' }
    
            for (let i = 2; i < points.length-1; i += 2)
            {
                // Map vertical line
                const results = this.mapVerticalLine(points[i-1], points[i], cell, i, ['crossing', 'overlap trace', 'overlap block'])
                traceLine.route.collisions.push(...results)
            }

            // Sort collisions by point number
            traceLine.route.collisions.sort((a, b) => a.point - b.point)
            traceLine.route.collisions.map
        })
        
        this.visualize()
        this.circuit.traceLayer.update()
    }

    protected mapHorizontalLine(a: Vec2, b: Vec2, cell: TraceCell, pointNum: number, detect: CollisionType[]) {
        const collisions: Collision[] = []
        console.assert(a.y == b.y, 'Invalid points for horizontal line:', a, b)
        const y = a.y
        this.grid.cells[y] ??= []
        if (a.x < b.x) {
            for (let x = a.x; x <= b.x; x++) {
                const collision = this.mapHorizontalLineCell(x, y, cell, pointNum, detect)
                if (collision) {
                    collisions.push(collision)
                    if (collision.type == 'joint' && detect.includes('joint')) break
                }
            }
        }
        else {
            for (let x = a.x; x >= b.x; x--) {
                const collision = this.mapHorizontalLineCell(x, y, cell, pointNum, detect)
                if (collision) {
                    collisions.push(collision)
                    if (collision.type == 'joint' && detect.includes('joint')) break
                }
            }            
        }
        return collisions
    }
    protected mapHorizontalLineCell(x: number, y: number, cell: TraceCell, pointNum: number, detect: CollisionType[]): Collision {
        DEBUG && console.info('map horizontal line cell', x, y)
        const target = this.grid.cells[y][x]
        // Collide with another line
        if (target?.type == CellType.Trace)
        {
            const type = (target.elem.sourcePinView == cell.elem.sourcePinView) ? 'joint'
                       : (target.direction == 'vertical') ? 'crossing'
                       : 'overlap trace'
            
            if (detect.includes(type)) return {
                type: type,
                target: target.elem,
                point: pointNum,
                pos: vec2(x, y),
            }
        }
        // Collide with block
        else if (target?.type == CellType.Block && detect.includes('overlap block')) {
            return {
                type: 'overlap block',
                target: target.elem,
                point: pointNum,
                pos: vec2(x, y),
            }
        }
        this.grid.cells[y][x] = cell
    }

    protected mapVerticalLine(a: Vec2, b: Vec2, cell: TraceCell, pointNum: number, detect: CollisionType[]) {
        const collisions: Collision[] = []
        console.assert(a.x == b.x, 'Invalid points for vertical line:', a, b)
        const x = a.x
        if (Math.abs(a.y - b.y) < 2) return []
        if (a.y < b.y) {
            for (let y = a.y + 1; y < b.y; y++) {
                this.grid.cells[y] ??= []
                const collision = this.mapVerticalLineCell(x, y, cell, pointNum, detect)
                if (collision) {
                    collisions.push(collision)
                    if (collision.type == 'joint' && detect.includes('joint')) break
                }
            }
        } else {
            for (let y = a.y - 1; y > b.y; y--) {
                this.grid.cells[y] ??= []
                const collision = this.mapVerticalLineCell(x, y, cell, pointNum, detect)
                if (collision) {
                    collisions.push(collision)
                    if (collision.type == 'joint' && detect.includes('joint')) break
                }
            }
        }
        return collisions
    }

    protected mapVerticalLineCell(x: number, y: number, cell: TraceCell, pointNum: number, detect: CollisionType[]): Collision {
        DEBUG && console.info('map vertical line cell', x, y)
        const target = this.grid.cells[y][x]
        // Collide with another line
        if (target?.type == CellType.Trace)
        {
            const type = (target.elem.sourcePinView == cell.elem.sourcePinView) ? 'joint'
                       : (target.direction == 'horizontal') ? 'crossing'
                       : 'overlap trace'
            
            if (detect.includes(type)) return {
                type,
                target: target.elem,
                point: pointNum,
                pos: vec2(x, y),
            }
        }
        // Collide with block
        else if (target?.type == CellType.Block && detect.includes('overlap block')) {
            return {
                type: 'overlap block',
                target: target.elem,
                point: pointNum,
                pos: vec2(x, y),
            }
        }
        this.grid.cells[y][x] = cell
    }
}