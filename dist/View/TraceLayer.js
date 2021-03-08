import Vec2, { vec2 } from '../Lib/Vector2.js';
const xmlns = 'http://www.w3.org/2000/svg';
const viewportPadding = 10;
const minReverseHorizontalYOffset = 5;
export class TraceRoute {
    get sourcePos() { return this.points[0]; }
    get destPos() { return this.points[this.points.length - 1]; }
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
    }
    addTrace(sourcePos, destPos, minSourceReach, minDestReach, color, pathAnchors = {}) {
        const points = this.calculateRoutePoints(sourcePos, destPos, minSourceReach, minDestReach, pathAnchors);
        const polyline = this.createPolyline(points, color);
        const trace = {
            sourcePos: sourcePos.copy(),
            destPos: destPos.copy(),
            minSourceReach,
            minDestReach,
            color,
            anchors: {
                verticalX1: points[1]?.x,
                horizontalY: points[2]?.y,
                verticalX2: points[3]?.x
            },
            points: points,
            polyline
        };
        this.traces.add(trace);
        return trace;
    }
    updateTraceRoute(trace, sourcePos, destPos) {
        trace.sourcePos.set(sourcePos);
        trace.destPos.set(destPos);
        let points = this.calculateRoutePoints(sourcePos, destPos, trace.minSourceReach, trace.minDestReach, trace.anchors);
        if (points.length != trace.points.length) {
            trace.anchors.verticalX1 = undefined;
            trace.anchors.horizontalY = undefined;
            trace.anchors.verticalX2 = undefined;
            points = this.calculateRoutePoints(sourcePos, destPos, trace.minSourceReach, trace.minDestReach);
        }
        // If route points has changed, update polyline
        if (!trace.points.every((current, index) => current.equal(points[index]))) {
            this.updatePolylinePoints(trace.polyline, points);
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
        const halfWidth = this.traceWidth / 2;
        const offsetX = Math.round(this.scale.x / 2); // - halfWidth
        const offsetY = Math.round(this.scale.y / 2); // - halfWidth
        this.cellOffset = vec2(offsetX, offsetY);
        console.log('cell offset:', this.cellOffset.toString());
        console.log('trace width', this.traceWidth);
    }
    get traceWidth() { return Math.round(this.style.traceWidth * this.scale.y); }
    calculateRoutePoints(sourcePos, destPos, sourceMinReach, destMinReach, anchors = {}) {
        let { verticalX1, horizontalY, verticalX2 } = anchors;
        const deltaX = destPos.x - sourcePos.x;
        const deltaY = destPos.y - sourcePos.y;
        // 1 line segment (2 points)
        if (deltaY == 0 && deltaX > 0) {
            return [
                vec2(sourcePos),
                vec2(destPos)
            ];
        }
        // 3 line segments (4 points)
        else if (deltaX >= (sourceMinReach + destMinReach) || Math.abs(deltaY) <= minReverseHorizontalYOffset) {
            if (verticalX1 == undefined)
                verticalX1 = Math.round(sourcePos.x + deltaX / 2);
            else if (verticalX1 < sourcePos.x + sourceMinReach)
                verticalX1 = sourcePos.x + sourceMinReach;
            else if (verticalX1 > destPos.x - destMinReach)
                verticalX1 = destPos.x - destMinReach;
            return [
                vec2(sourcePos),
                vec2(verticalX1, sourcePos.y),
                vec2(verticalX1, destPos.y),
                vec2(destPos)
            ];
        }
        // 5 line segments (6 points)
        else {
            if (!verticalX1)
                verticalX1 = sourcePos.x + sourceMinReach;
            else if (verticalX1 < sourcePos.x + sourceMinReach)
                verticalX1 = sourcePos.x + sourceMinReach;
            if (!verticalX2)
                verticalX2 = destPos.x + destMinReach;
            else if (verticalX2 > destPos.x - destMinReach)
                verticalX2 = destPos.x - destMinReach;
            horizontalY ??= (Math.abs(deltaY / 2) >= minReverseHorizontalYOffset)
                // Reverse line between source Y and dest Y
                ? sourcePos.y + Math.round(deltaY / 2)
                // Reverse line 
                : sourcePos.y + Math.sign(deltaY) * minReverseHorizontalYOffset;
            return [
                vec2(sourcePos),
                vec2(verticalX1, sourcePos.y),
                vec2(verticalX1, horizontalY),
                vec2(verticalX2, horizontalY),
                vec2(verticalX2, destPos.y),
                vec2(destPos)
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
        Object.assign(polyline.style, {
            fill: 'none',
            stroke: color,
            strokeWidth: this.traceWidth,
            pointerEvents: 'none'
        });
        polyline.setAttributeNS(null, 'points', svgPoints);
        this.svg.appendChild(polyline);
        return polyline;
    }
}
