import Vec2, {vec2} from '../Lib/Vector2.js'
import { Style } from './Common.js'
import { svgElement, svgElementWD, setSVGAttributes } from '../Lib/HTML.js'
import { Collision } from './CircuitGrid.js'
import { TraceLine } from './TraceLine.js'

const xmlns = 'http://www.w3.org/2000/svg'
 
const minReverseHorizontalYOffset = 3

export interface ITraceAnchors
{
    vertical1?: number,
    horizontal?: number,
    vertical2?: number
}

export class TraceRoute
{
    get destPos(): Vec2 { return this.points[0] }
    get sourcePos(): Vec2 { return this.points[this.points.length-1] }
    get midPoints(): Vec2[] { return this.points.slice(1, this.points.length-1)}

    minSourceReach: number
    minDestReach: number
    points: Vec2[]
    anchors: ITraceAnchors
    color: string
    polylines: SVGPolylineElement[]
    trimmedPoints: Vec2[]
    collisions: Collision[]
    jointDot: SVGCircleElement
    
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
        const polylines = this.createPolylines(points, color)        
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
            polylines
        })

        this.traces.add(trace)

        return trace
    }

    update() {
        console.log('TraceLayer update()')
        this.traces.forEach(trace => {
            this.updatePolylinePoints(trace, trace.trimmedPoints)
        })
    }

    resetCollisions() {
        this.traces.forEach(trace => trace.collisions = [])
    }

    setSelected(trace: TraceRoute) {
        this.updateColor(trace, this.style.colors.selection)
        const jointCollision = trace.collisions.find(col => col.type == 'joint')
        if (jointCollision?.type == 'joint') this.setSelected(jointCollision.target.route)
    }

    setUnselected(trace: TraceRoute) {
        this.updateColor(trace, trace.color)
        const jointCollision = trace.collisions.find(col => col.type == 'joint')
        if (jointCollision?.type == 'joint') this.setUnselected(jointCollision.target.route)
    }

    updateTraceRoute(trace: TraceRoute, sourcePos: Vec2, destPos: Vec2) {
        const deltaSource = Vec2.sub(sourcePos, trace.sourcePos)
        const deltaDest = Vec2.sub(destPos, trace.destPos)
        const diff = Vec2.sub(deltaSource, deltaDest).len()
        const concurrentMovement = (deltaSource.len() > 0 && diff < 0.001) 

        const points = (concurrentMovement)
            ? [destPos, ...trace.midPoints.map(point => Vec2.add(point, deltaSource)), sourcePos]
            : this.calculateRoutePoints(sourcePos, destPos, trace.minSourceReach, trace.minDestReach, trace.anchors)

        // If route points has changed, update polyline
        if (trace.points.some((current, index) => !current.equal(points[index]))) {
            this.updatePolylinePoints(trace, points)
        }

        if (concurrentMovement) {
            trace.anchors.vertical1 &&= points[1].x
            trace.anchors.horizontal &&= points[2].y
            trace.anchors.vertical2 &&= points[3].x
        }

        trace.points = points
    }

    updateColor(trace: TraceRoute, color: string) {
        trace.color = color
        trace.polylines.forEach(polyline => polyline.style.stroke = color)
        if (trace.jointDot) trace.jointDot.style.fill = color
    }

    deleteTrace(trace: TraceRoute) {
        trace.polylines.forEach(polyline => this.svg.removeChild(polyline))
        trace.jointDot && this.svg.removeChild(trace.jointDot)
        this.traces.delete(trace)
        trace = null
    }

    
    get size() {
        return vec2(this.svg.clientWidth, this.svg.clientHeight)
    }
    
    cellCenterScreenPos(pos: Vec2) { return Vec2.mul(pos, this.scale).add(this.cellOffset) }
    
    rescale(scale: Vec2) {
        this.scale = scale
        this.calcCellOffset()
        this.traces.forEach(trace => {
            this.updatePolylinePoints(trace, trace.points)
            trace.polylines.forEach(polyline => polyline.style.strokeWidth = this.traceWidth+'px')
        })
    }
    
    svg: SVGSVGElement

    readonly traces = new Set<TraceRoute>()
    
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
            top: '0px',     left: '0px',
            width: '100%',  height: '100%',
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
    }

    protected get traceWidth() { return Math.round(this.style.traceWidth * this.scale.y) }

    protected scale: Vec2
    protected style: Style

    protected cellOffset: Vec2

    protected calculateRoutePoints(sourcePos: Vec2, destPos: Vec2,
        sourceMinReach: number, destMinReach: number, anchors: ITraceAnchors): Vec2[]
    {
        let { vertical1: verticalX1, horizontal: horizontalY, vertical2: verticalX2 } = anchors
                
        const deltaX = destPos.x - sourcePos.x
        const deltaY = destPos.y - sourcePos.y
        
        // 1 line segment (2 points)
        if (Math.round(deltaY) == 0 && deltaX > -4) {
            
            anchors.vertical1 = undefined
            anchors.horizontal = undefined
            anchors.vertical2 = undefined

            return [
                vec2(destPos),
                vec2(sourcePos),
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
                vec2(destPos),
                vec2(verticalX1, destPos.y),
                vec2(verticalX1, sourcePos.y),
                vec2(sourcePos),
            ]
        }

        // 5 line segments (6 points)
        else {
            verticalX2 ??= Math.round(sourcePos.x + sourceMinReach)
            if (verticalX2 < sourcePos.x + sourceMinReach) verticalX2 = Math.round(sourcePos.x + sourceMinReach)

            verticalX1 ??= Math.round(destPos.x - destMinReach)
            if (verticalX1 > destPos.x - destMinReach) verticalX1 = Math.round(destPos.x - destMinReach)

            if (horizontalY == undefined) {
                if (Math.abs(deltaY / 2) >= minReverseHorizontalYOffset) {
                    // Reverse line between source Y and dest Y
                    horizontalY = Math.round(sourcePos.y + Math.round(deltaY / 2))
                } else {
                    // Reverse line over/under both
                    horizontalY = (deltaY > 0)
                        ? destPos.y + 4 
                        : destPos.y - 4
                    if (verticalX2 < destPos.x + 5) verticalX2 = Math.round(destPos.x + 5)
                }
            }

            anchors.vertical1 = verticalX1
            anchors.horizontal = horizontalY
            anchors.vertical2 = verticalX2

            return [
                vec2(destPos),                      //  0
                vec2(verticalX1, destPos.y),        //  1
                vec2(verticalX1, horizontalY),      //  2
                vec2(verticalX2, horizontalY),      //  3
                vec2(verticalX2, sourcePos.y),      //  4
                vec2(sourcePos),                    //  5
            ]
        }
    }

    protected generatePolylineSVGPointsList(path: Vec2[], collisionList: Collision[] = [])
    {
        let points = [...path]
        let collisions = [...collisionList]
        
        const crossings = collisions.filter(col => col.type == 'crossing')
        
        let sections = [points]
        
        if (crossings.length > 0) {
            let lastCutIndex: number
            let lastCutPos: Vec2

            sections = crossings.map(crossing =>
            {
                const targetPos = points[crossing.pointIndex]
                const prevPos = points[crossing.pointIndex-1]
                if (!targetPos || !prevPos) debugger
                console.assert(targetPos.x == prevPos.x, 'Crossing is not on a vertical line segment')
                const cutPos = crossing.pos
    
                const startIndex = lastCutIndex || 0
                const section = (lastCutPos)
                    ? [lastCutPos, ...points.slice(startIndex, crossing.pointIndex), cutPos]
                    : [...points.slice(startIndex, crossing.pointIndex), cutPos]
    
                lastCutIndex = crossing.pointIndex
                lastCutPos = crossing.pos
    
                return section
            })
            const lastIndex = points.length - 1
            sections.push([lastCutPos, ...points.slice(lastCutIndex, lastIndex + 1)])

            console.log('Crossings:', crossings)
            console.log('Crossing sections:', sections)
        }

        const crossingGap = this.style.traceCrossingGap * this.scale.y
        const svgPointList = sections.map((section, i) => {
            const scaledPoints = section.map(pos => Vec2.mul(pos, this.scale).add(this.cellOffset))
            
            // Shift start point y on all but first section
            if (sections.length > 1 && i > 0) {
                const dirY = Math.sign(scaledPoints[1].y - scaledPoints[0].y)
                scaledPoints[0] = vec2(scaledPoints[0].x, scaledPoints[0].y + dirY * crossingGap)
            }
            // Shift end point y on all but last section
            const lastIndex = section.length - 1
            if (sections.length > 1 && i < section.length) {
                const dirY = Math.sign(scaledPoints[lastIndex].y - scaledPoints[lastIndex-1].y)
                scaledPoints[lastIndex] = vec2(scaledPoints[lastIndex].x, scaledPoints[lastIndex].y - dirY * crossingGap)
            }

            const pointStrings = scaledPoints.map(pos => pos.x + ',' + pos.y)
            return pointStrings.join(' ')
        })

        return svgPointList
    }

    protected updateJointDot(trace: TraceRoute, joint: Collision)
    {
        const screenPos = this.cellCenterScreenPos(joint.pos)

        const dot = trace.jointDot ?? svgElement('circle')
        
        setSVGAttributes(dot, {
            cx: screenPos.x,
            cy: screenPos.y,
            r: this.style.traceDotSize * this.scale.y
        })
        
        Object.assign(dot.style, {
            fill: trace.color
        })
        
        trace.jointDot = dot
    }

    protected updatePolylinePoints(trace: TraceRoute, points: Vec2[])
    {
        const svgPointsList = this.generatePolylineSVGPointsList(points, trace.collisions)
        // Update or create trace polylines
        const polylines = trace.polylines
        svgPointsList.forEach((svgPoints, i) => {
            if (polylines[i]) polylines[i].setAttributeNS(null, 'points', svgPoints)
            else polylines[i] = this.createNewPolyline(trace.color, svgPoints)
        })
        // Trim excess polylines
        while (polylines.length > svgPointsList.length) {
            const polyline = polylines.pop()
            this.svg.removeChild(polyline)
        }
        // Draw dot
        const joint = trace.collisions.find(col => col.type == 'joint')
        if (joint) {
            console.log('Draw dot')
            this.updateJointDot(trace, joint)
            this.svg.appendChild(trace.jointDot)
        } else if (trace.jointDot) {
            this.svg.removeChild(trace.jointDot)
            trace.jointDot = null
        }
    }

    protected createNewPolyline(color: string, svgPoints: string)
    {
        const polyline = document.createElementNS(xmlns, 'polyline')

        const style = {
            fill: 'none',
            stroke: color,
            strokeWidth: this.traceWidth,
            pointerEvents: 'none',
            // filter: 'url(#traceFilter)'
        }
        // Line shadow. Does not work on straight horizontal line because effect bounds is relative to element size (def. -10%...120%)
        // const styleString = Object.entries(style).map(([key, value]) => `${key}: ${value};`).join(' ')
        // polyline.setAttribute('style', styleString)
        polyline.setAttribute('points', svgPoints)
        Object.assign(polyline.style, style)
        this.svg.appendChild(polyline)

        return polyline
    }

    protected createPolylines(points: Vec2[], color: string, collisions: Collision[] = [])
    {
        const svgPointsList = this.generatePolylineSVGPointsList(points, collisions)

        const polylines = svgPointsList.map(svgPoints => this.createNewPolyline(color, svgPoints))

        return polylines
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