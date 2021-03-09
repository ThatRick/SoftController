import Vec2, {vec2} from '../Lib/Vector2.js'
import { Style } from './Common.js'

const xmlns = 'http://www.w3.org/2000/svg'

function svgElement<K extends keyof SVGElementTagNameMap>(name: K, options: {
    svgAttributes?: Record<string, string | number>,
    css?: Partial<CSSStyleDeclaration>,
    parent?: SVGElement
}): SVGElementTagNameMap[K]
{
    // Create SVG Element
    const elem = document.createElementNS(xmlns, name)
    // Set SVG attributes
    options.svgAttributes && Object.entries(options.svgAttributes).forEach(([key, value]) => {
        elem.setAttribute(key, value.toString())
    })
    // Set CSS style
    options.css && Object.assign(elem.style, options.css)
    // Append to parent
    options.parent?.appendChild(elem)
    return elem
}

function svgElementWD(name: string, options: {
    svgAttributes?: Record<string, string|number>,
    css?: Partial<CSSStyleDeclaration>,
    parent?: SVGElement
}): SVGElement
{
    // Create SVG Element
    const elem = document.createElementNS(xmlns, name)
    // Set SVG attributes
    options.svgAttributes && Object.entries(options.svgAttributes).forEach(([key, value]) => {
        elem.setAttribute(key, value.toString())
    })
    // Set CSS style
    options.css && Object.assign(elem.style, options.css)
    // Append to parent
    options.parent?.appendChild(elem)
    return elem
}
 
const minReverseHorizontalYOffset = 3

export interface ITraceAnchors
{
    vertical1?: number,
    horizontal?: number,
    vertical2?: number
}

export class TraceRoute
{
    get sourcePos(): Vec2 { return this.points[0] }
    get destPos(): Vec2 { return this.points[this.points.length-1] }
    get midPoints(): Vec2[] { return this.points.slice(1, this.points.length-1)}

    minSourceReach: number
    minDestReach: number
    points: Vec2[]
    anchors: ITraceAnchors
    color: string
    polyline: SVGPolylineElement
    
    constructor(params: Partial<TraceRoute>) {
        Object.assign(this, params)
    }
}

export default class TraceLayer
{
    addTrace(sourcePos: Vec2, destPos: Vec2, minSourceReach: number, minDestReach: number,
        color: string, pathAnchors: ITraceAnchors = {}): TraceRoute
    {
        const points = this.calculateRoutePoints(sourcePos, destPos, minSourceReach, minDestReach, pathAnchors)
        const polyline = this.createPolyline(points, color)        
        const trace = new TraceRoute({
            minSourceReach,
            minDestReach,
            color,
            anchors: {
                vertical1:     points[1]?.x,
                horizontal:    points[2]?.y,
                vertical2:     points[3]?.x
            },
            points: points,
            polyline
        })

        this.traces.add(trace)

        return trace
    }

    updateTraceRoute(trace: TraceRoute, sourcePos: Vec2, destPos: Vec2) {
        const deltaSource = Vec2.sub(sourcePos, trace.sourcePos)
        const deltaDest = Vec2.sub(destPos, trace.destPos)
        const diff = Vec2.sub(deltaSource, deltaDest).len()
        const concurrentMovement = (deltaSource.len() > 0 && diff < 0.001) 

        const points = (concurrentMovement)
            ? [sourcePos, ...trace.midPoints.map(point => Vec2.add(point, deltaSource)), destPos]
            : this.calculateRoutePoints(sourcePos, destPos, trace.minSourceReach, trace.minDestReach, trace.anchors)

        // If route points has changed, update polyline
        if (trace.points.some((current, index) => !current.equal(points[index]))) {
            this.updatePolylinePoints(trace.polyline, points)
        }

        if (concurrentMovement) {
            trace.anchors.vertical1 &&= points[1].x
            trace.anchors.horizontal &&= points[2].y
            trace.anchors.vertical2 &&= points[3].x
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
        // this.createFilters()
    }

    protected calcCellOffset() {
        const correction = (this.traceWidth % 2 == 1) ? -0.5 : 0
        const offsetX = Math.round(this.scale.x / 2) + correction
        const offsetY = Math.round(this.scale.y / 2) + correction
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
        sourceMinReach: number, destMinReach: number, anchors: ITraceAnchors): Vec2[]
    {
        let { vertical1: verticalX1, horizontal: horizontalY, vertical2: verticalX2 } = anchors
                
        const deltaX = destPos.x - sourcePos.x
        const deltaY = destPos.y - sourcePos.y
        
        // 1 line segment (2 points)
        if (deltaY == 0 && deltaX > 0) {
            
            anchors.vertical1 = undefined
            anchors.horizontal = undefined
            anchors.vertical2 = undefined

            return [
                vec2(sourcePos),
                vec2(destPos)
            ]
        }
        
        // 3 line segments (4 points)
        else if (deltaX >= (sourceMinReach + destMinReach)) {
            verticalX1 ??= Math.round(sourcePos.x + deltaX / 2)
            if (verticalX1 < sourcePos.x + sourceMinReach) verticalX1 = Math.round(sourcePos.x + sourceMinReach)
            if (verticalX1 > destPos.x - destMinReach) verticalX1 = Math.round(destPos.x - destMinReach)
            
            anchors.vertical1 = verticalX1
            anchors.horizontal = undefined
            anchors.vertical2 = undefined

            return [
                vec2(sourcePos),
                vec2(verticalX1, sourcePos.y),
                vec2(verticalX1, destPos.y),
                vec2(destPos)
            ]
        }

        // 5 line segments (6 points)
        else {
            verticalX1 ??= Math.round(sourcePos.x + sourceMinReach)
            if (verticalX1 < sourcePos.x + sourceMinReach) verticalX1 = Math.round(sourcePos.x + sourceMinReach)

            verticalX2 ??= Math.round(destPos.x - destMinReach)
            if (verticalX2 > destPos.x - destMinReach) verticalX2 = Math.round(destPos.x - destMinReach)

            if (horizontalY == undefined) {
                if (Math.abs(deltaY / 2) >= minReverseHorizontalYOffset) {
                    // Reverse line between source Y and dest Y
                    horizontalY = Math.round(sourcePos.y + Math.round(deltaY / 2))
                } else {
                    // Reverse line over/under both
                    horizontalY = (deltaY > 0)
                        ? destPos.y + 4 
                        : destPos.y - 4
                    if (verticalX1 < destPos.x + 5) verticalX1 = Math.round(destPos.x + 5)
                }
            }

            anchors.vertical1 = verticalX1
            anchors.horizontal = horizontalY
            anchors.vertical2 = verticalX2

            return [
                vec2(sourcePos),                    //  0
                vec2(verticalX1, sourcePos.y),      //  1
                vec2(verticalX1, horizontalY),      //  2
                vec2(verticalX2, horizontalY),      //  3
                vec2(verticalX2, destPos.y),        //  4
                vec2(destPos)                       //  5
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

        const style = {
            fill: 'none',
            stroke: color,
            strokeWidth: this.traceWidth,
            pointerEvents: 'none',
            // filter: 'url(#traceFilter)'
        }
        Object.assign(polyline.style, style)
        // const styleString = Object.entries(style).map(([key, value]) => `${key}: ${value};`).join(' ')
        //polyline.setAttribute('style', styleString)

        polyline.setAttribute('points', svgPoints)

        this.svg.appendChild(polyline)

        return polyline
    }

    protected createFilters() {
        const defs = svgElement('defs', { parent: this.svg })
        const filter = svgElement('filter', {
            svgAttributes: {
                id: 'traceFilter',
            },
            parent: defs,
        })
        const shadowFilter = svgElementWD('feDropShadow', {
            svgAttributes: {
                dx: 1, dy: 1,
                stdDeviation: 2,
                'flood-color': 'black',
                'flood-opacity': 2
            },
            parent: filter
        })
    }
}