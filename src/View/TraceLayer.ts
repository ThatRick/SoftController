import Vec2, {vec2} from '../Lib/Vector2.js'

const xmlns = 'http://www.w3.org/2000/svg'
 
const sizePadding = 10

export interface ITracePathAnchors
{
    verticalX1?: number,
    horizontalY?: number,
    verticalX2?: number
}

export interface ITracePath
{
    sourcePos: Vec2
    destPos: Vec2,
    minSourceReach: number,
    minDestReach: number,
    midpoints: Vec2[],
    anchors: ITracePathAnchors,
    color: string
    segments: SVGLineElement[]
}

export default class TraceLayer
{
    addTrace(sourcePos: Vec2, destPos: Vec2, minSourceReach: number, minDestReach: number,
        color: string, pathAnchors: ITracePathAnchors = {}): ITracePath
    {
        let segments: SVGLineElement[]

        const midpoints = this.calculatePath(sourcePos, destPos, minSourceReach, minDestReach, pathAnchors)
        
        switch (midpoints.length)
        {
            case 0:     // 1 line segment
            {
                segments = [this.createSegment(sourcePos, destPos, color)]
                break
            }

            case 2:     // 3 line segments
            {
                const [ va, vb ] = midpoints
    
                segments = [
                    this.createSegment(sourcePos, va, color),   // horizontal 1
                    this.createSegment(va, vb, color),          // vertical
                    this.createSegment(vb, destPos, color),     // horizontal 2
                ]
                break
            }

            case 4:     // 5 line segments
            {    
                const [ v1a, v1b, v2a, v2b ] = midpoints
    
                segments = [
                    this.createSegment(sourcePos, v1a, color),  // horizontal 1
                    this.createSegment(v1a, v1b, color),        // vertical 1
                    this.createSegment(v1b, v2a, color),        // horizontal 2
                    this.createSegment(v2a, v2b, color),        // vertical 2
                    this.createSegment(v2b, destPos, color),    // horizontal 3
                ]
                break
            }

            default:
            {
                console.error('Trace layer: invalid number of trace midpoints:', midpoints.length)
            }
        }
        
        const path: ITracePath =
        {
            sourcePos: sourcePos.copy(),
            destPos: destPos.copy(),
            minSourceReach,
            minDestReach,
            color,
            anchors: {
                verticalX1:     midpoints[1]?.x,
                horizontalY:    midpoints[2]?.y,
                verticalX2:     midpoints[3]?.x
            },
            midpoints,
            segments
        }

        this.traces.add(path)

        return path
    }

    updatePath(path: ITracePath, sourcePos: Vec2, destPos: Vec2) {
        path.sourcePos = sourcePos.copy()
        path.destPos = sourcePos.copy()
        const midpoints = this.calculatePath(sourcePos, destPos, path.minSourceReach, path.minDestReach, path.anchors)

    }

    updateColor(path: ITracePath, color: string) {
        path.segments.forEach(line => line.style.stroke = color)
    }

    deleteTrace(path: ITracePath) {
        path.segments.forEach(line => this.svg.removeChild(line))
        this.traces.delete(path)
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

    protected traces: Set<ITracePath>

    protected lineCSSStyle =
    {
        strokeWidth: 2,
        pointerEvents: 'visible'
    }


    protected calculatePath(sourcePos: Vec2, destPos: Vec2,
        sourceMinReach: number, destMinReach: number, anchors: ITracePathAnchors = {}): Vec2[]
    {
        let { verticalX1, horizontalY, verticalX2 } = anchors
                
        const offsetX = destPos.x - sourcePos.x
        const offsetY = destPos.y - sourcePos.y
        
        // 1 segment (no midpoints)
        if (offsetY == 0 && offsetX > 0) {
            return []
        }
        
        // 3 segments (2 midpoints)
        else if (offsetX >= sourceMinReach + destMinReach) {
            if (verticalX1 == undefined) verticalX1 = sourcePos.x + offsetX / 2
            else if (verticalX1 < sourcePos.x + sourceMinReach) verticalX1 = sourcePos.x + sourceMinReach
            else if (verticalX1 > destPos.x - destMinReach) verticalX1 = destPos.x - destMinReach

            return [
                vec2(verticalX1, sourcePos.y),
                vec2(verticalX1, destPos.y)
            ]
        }

        // 5 segments (4 midpoints)
        else {
            if (!verticalX1) verticalX1 = sourcePos.x + sourceMinReach
            else if (verticalX1 < sourcePos.x + sourceMinReach) verticalX1 = sourcePos.x + sourceMinReach

            if (!verticalX2) verticalX2 = destPos.x + destMinReach
            else if (verticalX2 > destPos.x - destMinReach) verticalX2 = destPos.x - destMinReach

            if (!horizontalY) horizontalY = sourcePos.y + Math.round(offsetY / 2)

            return [
                vec2(verticalX1, sourcePos.y),
                vec2(verticalX1, horizontalY),
                vec2(verticalX2, horizontalY),
                vec2(verticalX2, destPos.y)
            ]
        }
    }

    protected createSegment(_a: Vec2, _b: Vec2, color: string): SVGLineElement {

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
        if (max.x > this.svg.clientWidth - sizePadding) this.svg.style.width = max.x + sizePadding + 'px'
        if (max.y > this.svg.clientHeight - sizePadding) this.svg.style.height = max.y + sizePadding + 'px'

        Object.entries(lineProps).forEach(([key, value]) => line.setAttributeNS(null, key.toString(), value.toString()))
        
        Object.assign(line.style, {
            ...this.lineCSSStyle,
            stroke: color
        })

        this.svg.appendChild(line)

        return line
    }
}