import Vec2, { vec2 } from '../Lib/Vector2.js';
const xmlns = 'http://www.w3.org/2000/svg';
function svgElement(name, options) {
    // Create SVG Element
    const elem = document.createElementNS(xmlns, name);
    // Set SVG attributes
    options.svgAttributes && Object.entries(options.svgAttributes).forEach(([key, value]) => {
        elem.setAttribute(key, value.toString());
    });
    // Set CSS style
    options.css && Object.assign(elem.style, options.css);
    // Append to parent
    options.parent?.appendChild(elem);
    return elem;
}
function svgElementWD(name, options) {
    // Create SVG Element
    const elem = document.createElementNS(xmlns, name);
    // Set SVG attributes
    options.svgAttributes && Object.entries(options.svgAttributes).forEach(([key, value]) => {
        elem.setAttribute(key, value.toString());
    });
    // Set CSS style
    options.css && Object.assign(elem.style, options.css);
    // Append to parent
    options.parent?.appendChild(elem);
    return elem;
}
const minReverseHorizontalYOffset = 3;
export class TraceRoute {
    constructor(params) {
        Object.assign(this, params);
    }
    get sourcePos() { return this.points[0]; }
    get destPos() { return this.points[this.points.length - 1]; }
    get midPoints() { return this.points.slice(1, this.points.length - 1); }
}
export default class TraceLayer {
    //  Constructor
    // -------------
    constructor(parent, scale, style) {
        this.traces = new Set();
        const svg = document.createElementNS(xmlns, 'svg');
        this.svg = svg;
        this.scale = scale;
        this.style = style;
        this.calcCellOffset();
        Object.assign(svg.style, {
            position: 'absolute',
            top: '0px', left: '0px',
            width: '100%', height: '100%',
            pointerEvents: 'none'
        });
        parent.appendChild(svg);
        // this.createFilters()
    }
    addTrace(sourcePos, destPos, minSourceReach, minDestReach, color, pathAnchors = {}) {
        const points = this.calculateRoutePoints(sourcePos, destPos, minSourceReach, minDestReach, pathAnchors);
        const polyline = this.createPolyline(points, color);
        const trace = new TraceRoute({
            minSourceReach,
            minDestReach,
            color,
            anchors: {
                vertical1: points[1]?.x,
                horizontal: points[2]?.y,
                vertical2: points[3]?.x
            },
            points: points,
            polyline
        });
        this.traces.add(trace);
        return trace;
    }
    updateTraceRoute(trace, sourcePos, destPos) {
        const deltaSource = Vec2.sub(sourcePos, trace.sourcePos);
        const deltaDest = Vec2.sub(destPos, trace.destPos);
        const diff = Vec2.sub(deltaSource, deltaDest).len();
        const concurrentMovement = (deltaSource.len() > 0 && diff < 0.001);
        const points = (concurrentMovement)
            ? [sourcePos, ...trace.midPoints.map(point => Vec2.add(point, deltaSource)), destPos]
            : this.calculateRoutePoints(sourcePos, destPos, trace.minSourceReach, trace.minDestReach, trace.anchors);
        // If route points has changed, update polyline
        if (trace.points.some((current, index) => !current.equal(points[index]))) {
            this.updatePolylinePoints(trace.polyline, points);
        }
        if (concurrentMovement) {
            trace.anchors.vertical1 &&= points[1].x;
            trace.anchors.horizontal &&= points[2].y;
            trace.anchors.vertical2 &&= points[3].x;
        }
        trace.points = points;
    }
    updateColor(trace, color) {
        trace.polyline.style.stroke = color;
    }
    deleteTrace(trace) {
        this.svg.removeChild(trace.polyline);
        this.traces.delete(trace);
        trace = null;
    }
    get size() {
        return vec2(this.svg.clientWidth, this.svg.clientHeight);
    }
    rescale(scale) {
        this.scale = scale;
        this.calcCellOffset();
        this.traces.forEach(trace => {
            this.updatePolylinePoints(trace.polyline, trace.points);
            trace.polyline.style.strokeWidth = this.traceWidth + 'px';
        });
    }
    calcCellOffset() {
        const correction = (this.traceWidth % 2 == 1) ? -0.5 : 0;
        const offsetX = Math.round(this.scale.x / 2) + correction;
        const offsetY = Math.round(this.scale.y / 2) + correction;
        this.cellOffset = vec2(offsetX, offsetY);
        console.log('cell offset:', this.cellOffset.toString());
        console.log('trace width', this.traceWidth);
    }
    get traceWidth() { return Math.round(this.style.traceWidth * this.scale.y); }
    calculateRoutePoints(sourcePos, destPos, sourceMinReach, destMinReach, anchors) {
        let { vertical1: verticalX1, horizontal: horizontalY, vertical2: verticalX2 } = anchors;
        const deltaX = destPos.x - sourcePos.x;
        const deltaY = destPos.y - sourcePos.y;
        // 1 line segment (2 points)
        if (deltaY == 0 && deltaX > 0) {
            anchors.vertical1 = undefined;
            anchors.horizontal = undefined;
            anchors.vertical2 = undefined;
            return [
                vec2(sourcePos),
                vec2(destPos)
            ];
        }
        // 3 line segments (4 points)
        else if (deltaX >= (sourceMinReach + destMinReach)) {
            verticalX1 ??= Math.round(sourcePos.x + deltaX / 2);
            if (verticalX1 < sourcePos.x + sourceMinReach)
                verticalX1 = Math.round(sourcePos.x + sourceMinReach);
            if (verticalX1 > destPos.x - destMinReach)
                verticalX1 = Math.round(destPos.x - destMinReach);
            anchors.vertical1 = verticalX1;
            anchors.horizontal = undefined;
            anchors.vertical2 = undefined;
            return [
                vec2(sourcePos),
                vec2(verticalX1, sourcePos.y),
                vec2(verticalX1, destPos.y),
                vec2(destPos)
            ];
        }
        // 5 line segments (6 points)
        else {
            verticalX1 ??= Math.round(sourcePos.x + sourceMinReach);
            if (verticalX1 < sourcePos.x + sourceMinReach)
                verticalX1 = Math.round(sourcePos.x + sourceMinReach);
            verticalX2 ??= Math.round(destPos.x - destMinReach);
            if (verticalX2 > destPos.x - destMinReach)
                verticalX2 = Math.round(destPos.x - destMinReach);
            if (horizontalY == undefined) {
                if (Math.abs(deltaY / 2) >= minReverseHorizontalYOffset) {
                    // Reverse line between source Y and dest Y
                    horizontalY = Math.round(sourcePos.y + Math.round(deltaY / 2));
                }
                else {
                    // Reverse line over/under both
                    horizontalY = (deltaY > 0)
                        ? destPos.y + 4
                        : destPos.y - 4;
                    if (verticalX1 < destPos.x + 5)
                        verticalX1 = Math.round(destPos.x + 5);
                }
            }
            anchors.vertical1 = verticalX1;
            anchors.horizontal = horizontalY;
            anchors.vertical2 = verticalX2;
            return [
                vec2(sourcePos),
                vec2(verticalX1, sourcePos.y),
                vec2(verticalX1, horizontalY),
                vec2(verticalX2, horizontalY),
                vec2(verticalX2, destPos.y),
                vec2(destPos) //  5
            ];
        }
    }
    polylinePoints(points) {
        const scaledPoints = points.map(pos => Vec2.mul(pos, this.scale).add(this.cellOffset));
        const pointStrings = scaledPoints.map(pos => pos.x + ',' + pos.y);
        const svgPoints = pointStrings.join(' ');
        return svgPoints;
    }
    updatePolylinePoints(polyline, points) {
        const svgPoints = this.polylinePoints(points);
        polyline.setAttributeNS(null, 'points', svgPoints);
    }
    createPolyline(points, color) {
        const svgPoints = this.polylinePoints(points);
        const polyline = document.createElementNS(xmlns, 'polyline');
        const style = {
            fill: 'none',
            stroke: color,
            strokeWidth: this.traceWidth,
            pointerEvents: 'none',
        };
        Object.assign(polyline.style, style);
        // const styleString = Object.entries(style).map(([key, value]) => `${key}: ${value};`).join(' ')
        //polyline.setAttribute('style', styleString)
        polyline.setAttribute('points', svgPoints);
        this.svg.appendChild(polyline);
        return polyline;
    }
    createFilters() {
        const defs = svgElement('defs', { parent: this.svg });
        const filter = svgElement('filter', {
            svgAttributes: {
                id: 'traceFilter',
            },
            parent: defs,
        });
        const shadowFilter = svgElementWD('feDropShadow', {
            svgAttributes: {
                dx: 1, dy: 1,
                stdDeviation: 2,
                'flood-color': 'black',
                'flood-opacity': 2
            },
            parent: filter
        });
    }
}
