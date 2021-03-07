import Vec2, {vec2} from '../Lib/Vector2.js'
import { Style } from './Common.js'

const xmlns = 'http://www.w3.org/2000/svg'
 
const viewportPadding = 10
const minReverseHorizontalYOffset = 5

export interface ITracePathAnchors
{
    verticalX1?: number,
    horizontalY?: number,
    verticalX2?: number
}

export class TraceRoute
{
    get sourcePos(): Vec2 { return this.points[0] }
    get destPos(): Vec2 { return this.points[this.points.length-1] }
    minSourceReach: number
    minDestReach: number
    points: Vec2[]
    anchors: ITracePathAnchors
    color: string
    polyline: SVGPolylineElement
}

export default class TraceLayer
{
    addTrace(sourcePos: Vec2, destPos: Vec2, minSourceReach: number, minDestReach: number,
        color: string, pathAnchors: ITracePathAnchors = {}): TraceRoute
    {
        const points = this.calculateRoutePoints(sourcePos, destPos, minSourceReach, minDestReach, pathAnchors)
        const polyline = this.createPolyline(points, color)        
        const trace: TraceRoute =
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
            polyline
        }

        this.traces.add(trace)

        return trace
    }

    updateTraceRoute(trace: TraceRoute, sourcePos: Vec2, destPos: Vec2) {
        trace.sourcePos.set(sourcePos)
        trace.destPos.set(destPos)

        const points = this.calculateRoutePoints(sourcePos, destPos, trace.minSourceReach, trace.minDestReach, trace.anchors)
        
        // If route points has changed, update polyline
        if (points.length != trace.points.length || !trace.points.every((current, index) => current.equal(points[index]))) {
            this.updatePolylinePoints(trace.polyline, points)
        }

        trace.points = points
    }

    updateColor(trace: TraceRoute, color: string) {
        trace.polyline.style.stroke = color
    }

    deleteTrace(trace: TraceRoute) {
        this.svg.removeChild(trace.polyline)
        this.traces.delete(trace)
        trace = null
    }

    get size() {
        return vec2(this.svg.clientWidth, this.svg.clientHeight)
    }

    rescale(scale: Vec2) {
        this.scale = scale
        this.calcCellOffset()
        this.traces.forEach(trace => {
            this.updatePolylinePoints(trace.polyline, trace.points)
            trace.polyline.style.strokeWidth = this.traceWidth+'px'
        })
    }
    
    //  Constructor
    // -------------
    constructor(parent: HTMLElement, scale: Vec2, style: Style)
    {
        const svg = document.createElementNS(xmlns, 'svg');
        this.svg = svg
        this.scale = scale
        this.style = style
        this.calcCellOffset()

        Object.assign(svg.style,
        {
            position: 'absolute',
            top: '0px', left: '0px',
            width: '100%', height: '100%',
            pointerEvents: 'none'
        } as Partial<CSSStyleDeclaration>)
        
        parent.appendChild(svg)
    }

    protected calcCellOffset() {
        const halfWidth = this.traceWidth / 2
        const offsetX = Math.round(this.scale.x / 2)// - halfWidth
        const offsetY = Math.round(this.scale.y / 2)// - halfWidth
        this.cellOffset = vec2(offsetX, offsetY)
        console.log('cell offset:', this.cellOffset.toString())
        console.log('trace width', this.traceWidth)
    }

    protected get traceWidth() { return Math.round(this.style.traceWidth * this.scale.y) }

    protected svg: SVGSVGElement
    protected scale: Vec2
    protected style: Style

    protected cellOffset: Vec2

    protected traces = new Set<TraceRoute>()

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
            if (verticalX1 == undefined) verticalX1 = Math.round(sourcePos.x + offsetX / 2)
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

            if (!horizontalY) {
                if (Math.abs(offsetY / 2) >= minReverseHorizontalYOffset) horizontalY = sourcePos.y + Math.round(offsetY / 2)
                else horizontalY = sourcePos.y + Math.sign(offsetY) * minReverseHorizontalYOffset
            }

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

    protected polylinePoints(points: Vec2[])
    {
        const scaledPoints = points.map(pos => Vec2.mul(pos, this.scale).add(this.cellOffset))
        const pointStrings = scaledPoints.map(pos => pos.x + ',' + pos.y)
        const svgPoints = pointStrings.join(' ')

        return svgPoints
    }

    protected updatePolylinePoints(polyline: SVGPolylineElement, points: Vec2[])
    {
        const svgPoints = this.polylinePoints(points)
        polyline.setAttributeNS(null, 'points', svgPoints)
    }

    protected createPolyline(points: Vec2[], color: string)
    {
        const svgPoints = this.polylinePoints(points)

        const polyline = document.createElementNS(xmlns, 'polyline')

        Object.assign(polyline.style, {
            fill: 'none',
            stroke: color,
            strokeWidth: this.traceWidth,
            pointerEvents: 'none'
        })

        polyline.setAttributeNS(null, 'points', svgPoints)

        this.svg.appendChild(polyline)

        return polyline
    }

}