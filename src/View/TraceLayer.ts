import Vec2, {vec2} from '../Lib/Vector2.js'

const xmlns = 'http://www.w3.org/2000/svg'
 
const viewportPadding = 10

export interface ITracePathAnchors
{
    verticalX1?: number,
    horizontalY?: number,
    verticalX2?: number
}

export class Trace
{
    get sourcePos(): Vec2 { return this.points[0] }
    get destPos(): Vec2 { return this.points[this.points.length-1] }
    minSourceReach: number
    minDestReach: number
    points: Vec2[]
    anchors: ITracePathAnchors
    color: string
    lineSegments: SVGLineElement[]
}

export default class TraceLayer
{
    addTrace(sourcePos: Vec2, destPos: Vec2, minSourceReach: number, minDestReach: number,
        color: string, pathAnchors: ITracePathAnchors = {}): Trace
    {
        const points = this.calculateRoutePoints(sourcePos, destPos, minSourceReach, minDestReach, pathAnchors)
        const lineSegments = this.createLineSegments(points, color)
        
        const trace: Trace =
        {
            sourcePos: sourcePos.copy(),
            destPos: destPos.copy(),
            minSourceReach,
            minDestReach,
            color,
            anchors: {
                verticalX1:     points[1]?.x,
                horizontalY:    points[2]?.y,
                verticalX2:     points[3]?.x
            },
            points: points,
            lineSegments: lineSegments
        }

        this.traces.add(trace)

        return trace
    }

    updateTracePath(trace: Trace, sourcePos: Vec2, destPos: Vec2) {
        const points = this.calculateRoutePoints(sourcePos, destPos, trace.minSourceReach, trace.minDestReach, trace.anchors)
        // If route point count changes, recreate all line segments
        if (points.length != trace.points.length) {
            trace.lineSegments.forEach(line => this.svg.removeChild(line))
            trace.lineSegments = this.createLineSegments(points, trace.color)
        }
        // if route points changed
        trace.points.forEach((currentPoint, index) => {
            const newPoint = points[index]
            if (!currentPoint.equal(newPoint)) {
                const segmentIndex = 0
            }
        })
    }

    updateColor(trace: Trace, color: string) {
        trace.lineSegments.forEach(line => line.style.stroke = color)
    }

    deleteTrace(trace: Trace) {
        trace.lineSegments.forEach(line => this.svg.removeChild(line))
        this.traces.delete(trace)
        trace = null
    }

    get size() {
        return vec2(this.svg.clientWidth, this.svg.clientHeight)
    }
    
    //  Constructor
    // -------------
    constructor(parent: HTMLElement, scale: Vec2)
    {
        const svg = document.createElementNS(xmlns, 'svg');
        this.svg = svg
        this.scale = scale
        this.cellOffset = Vec2.scale(this.scale, 0.5)

        Object.assign(svg.style,
        {
            position: 'absolute',
            top: '0px', left: '0px',
            width: '100%', height: '100%',
            pointerEvents: 'none'
        } as Partial<CSSStyleDeclaration>)
        
        parent.appendChild(svg)
    }

    protected svg: SVGSVGElement
    protected scale: Vec2
    protected cellOffset: Vec2

    protected traces: Set<Trace>

    protected lineCSSStyle =
    {
        strokeWidth: 2,
        pointerEvents: 'visible'
    }

    protected calculateRoutePoints(sourcePos: Vec2, destPos: Vec2,
        sourceMinReach: number, destMinReach: number, anchors: ITracePathAnchors = {}): Vec2[]
    {
        let { verticalX1, horizontalY, verticalX2 } = anchors
                
        const offsetX = destPos.x - sourcePos.x
        const offsetY = destPos.y - sourcePos.y
        
        // 1 line segment (2 points)
        if (offsetY == 0 && offsetX > 0) {
            return [
                vec2(sourcePos),
                vec2(destPos)
            ]
        }
        
        // 3 line segments (4 points)
        else if (offsetX >= sourceMinReach + destMinReach) {
            if (verticalX1 == undefined) verticalX1 = sourcePos.x + offsetX / 2
            else if (verticalX1 < sourcePos.x + sourceMinReach) verticalX1 = sourcePos.x + sourceMinReach
            else if (verticalX1 > destPos.x - destMinReach) verticalX1 = destPos.x - destMinReach

            return [
                vec2(sourcePos),
                vec2(verticalX1, sourcePos.y),
                vec2(verticalX1, destPos.y),
                vec2(destPos)
            ]
        }

        // 5 line segments (6 points)
        else {
            if (!verticalX1) verticalX1 = sourcePos.x + sourceMinReach
            else if (verticalX1 < sourcePos.x + sourceMinReach) verticalX1 = sourcePos.x + sourceMinReach

            if (!verticalX2) verticalX2 = destPos.x + destMinReach
            else if (verticalX2 > destPos.x - destMinReach) verticalX2 = destPos.x - destMinReach

            if (!horizontalY) horizontalY = sourcePos.y + Math.round(offsetY / 2)

            return [
                vec2(sourcePos),
                vec2(verticalX1, sourcePos.y),
                vec2(verticalX1, horizontalY),
                vec2(verticalX2, horizontalY),
                vec2(verticalX2, destPos.y),
                vec2(destPos)
            ]
        }
    }

    protected createLineSegments(points: Vec2[], color: string) {
        
        let lineSegments: SVGLineElement[]
        
        switch (points.length)
        {
            case 2:     // 1 line segment
            {
                const [ start, end ] = points

                lineSegments = [this.createLineSegment(start, end, color)]
                break
            }

            case 4:     // 3 line lineSegments
            {
                const [ start, va, vb, end ] = points
    
                lineSegments = [
                    this.createLineSegment(start, va, color),   // horizontal 1
                    this.createLineSegment(va, vb, color),      // vertical
                    this.createLineSegment(vb, end, color),     // horizontal 2
                ]
                break
            }

            case 6:     // 5 line lineSegments
            {    
                const [ start, v1a, v1b, v2a, v2b, end ] = points
    
                lineSegments = [
                    this.createLineSegment(start, v1a, color),  // horizontal 1
                    this.createLineSegment(v1a, v1b, color),    // vertical 1
                    this.createLineSegment(v1b, v2a, color),    // horizontal 2
                    this.createLineSegment(v2a, v2b, color),    // vertical 2
                    this.createLineSegment(v2b, end, color),    // horizontal 3
                ]
                break
            }

            default:
            {
                console.error('Trace layer: invalid number of trace midpoints:', points.length)
            }

            return lineSegments
        }
    }

    protected setLineSegmentStartPos(line: SVGLineElement, pos: Vec2) {
        const scaledPos = Vec2.mul(pos, this.scale).add(this.cellOffset)
        line.setAttributeNS(null, 'x1', scaledPos.x.toString())
        line.setAttributeNS(null, 'y1', scaledPos.y.toString())
    }

    protected setLineSegmentEndPos(line: SVGLineElement, pos: Vec2) {
        const scaledPos = Vec2.mul(pos, this.scale).add(this.cellOffset)
        line.setAttributeNS(null, 'x2', scaledPos.x.toString())
        line.setAttributeNS(null, 'y2', scaledPos.y.toString())
    }

    protected createLineSegment(_a: Vec2, _b: Vec2, color: string): SVGLineElement {

        const a = Vec2.mul(_a, this.scale).add(this.cellOffset)
        const b = Vec2.mul(_b, this.scale).add(this.cellOffset)

        const addition = this.lineCSSStyle.strokeWidth / 2
        // Elongate horizontal line to fix corners
        if (_a.y == _b.y) {
            const dir = (_a.x < _b.x) ? 1 : -1
            a.x -= addition * dir
            b.x += addition * dir
        }
        // Elongate vertical line to fix corners
        if (_a.x == _b.x) {
            const dir = (_a.y < _b.y) ? 1 : -1
            a.y -= addition * dir
            b.y += addition * dir
        }

        const line = document.createElementNS(xmlns, 'line');
        const lineProps = {
            x1: a.x,
            y1: a.y,
            x2: b.x,
            y2: b.y
        }
        // Resize SVG viewport if line point is outside viewport bounds
        const max = Vec2.max(a, b).round()
        if (max.x > this.svg.clientWidth - viewportPadding) this.svg.style.width = max.x + viewportPadding + 'px'
        if (max.y > this.svg.clientHeight - viewportPadding) this.svg.style.height = max.y + viewportPadding + 'px'

        Object.entries(lineProps).forEach(([key, value]) => line.setAttributeNS(null, key.toString(), value.toString()))
        
        Object.assign(line.style, {
            ...this.lineCSSStyle,
            stroke: color
        })

        this.svg.appendChild(line)

        return line
    }
}