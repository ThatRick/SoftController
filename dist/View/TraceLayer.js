import Vec2, { vec2 } from '../Lib/Vector2.js';
import { svgElement, svgElementWD } from '../Lib/HTML.js';
const xmlns = 'http://www.w3.org/2000/svg';
const minReverseHorizontalYOffset = 3;
export class TraceRoute {
    constructor(params) {
        Object.assign(this, params);
    }
    get destPos() { return this.points[0]; }
    get sourcePos() { return this.points[this.points.length - 1]; }
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
        const polylines = this.createPolylines(points, color);
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
            polylines
        });
        this.traces.add(trace);
        return trace;
    }
    update() {
        this.traces.forEach(trace => {
            this.updatePolylinePoints(trace, trace.points);
        });
    }
    updateTraceRoute(trace, sourcePos, destPos) {
        const deltaSource = Vec2.sub(sourcePos, trace.sourcePos);
        const deltaDest = Vec2.sub(destPos, trace.destPos);
        const diff = Vec2.sub(deltaSource, deltaDest).len();
        const concurrentMovement = (deltaSource.len() > 0 && diff < 0.001);
        const points = (concurrentMovement)
            ? [destPos, ...trace.midPoints.map(point => Vec2.add(point, deltaSource)), sourcePos]
            : this.calculateRoutePoints(sourcePos, destPos, trace.minSourceReach, trace.minDestReach, trace.anchors);
        // If route points has changed, update polyline
        if (trace.points.some((current, index) => !current.equal(points[index]))) {
            this.updatePolylinePoints(trace, points);
        }
        if (concurrentMovement) {
            trace.anchors.vertical1 &&= points[1].x;
            trace.anchors.horizontal &&= points[2].y;
            trace.anchors.vertical2 &&= points[3].x;
        }
        trace.points = points;
    }
    updateColor(trace, color) {
        trace.polylines.forEach(polyline => polyline.style.stroke = color);
    }
    deleteTrace(trace) {
        trace.polylines.forEach(polyline => this.svg.removeChild(polyline));
        this.traces.delete(trace);
        trace = null;
    }
    get size() {
        return vec2(this.svg.clientWidth, this.svg.clientHeight);
    }
    cellCenterScreenPos(pos) { return Vec2.mul(pos, this.scale).add(this.cellOffset); }
    rescale(scale) {
        this.scale = scale;
        this.calcCellOffset();
        this.traces.forEach(trace => {
            this.updatePolylinePoints(trace, trace.points);
            trace.polylines.forEach(polyline => polyline.style.strokeWidth = this.traceWidth + 'px');
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
                vec2(destPos),
                vec2(sourcePos),
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
                vec2(destPos),
                vec2(verticalX1, destPos.y),
                vec2(verticalX1, sourcePos.y),
                vec2(sourcePos),
            ];
        }
        // 5 line segments (6 points)
        else {
            verticalX2 ??= Math.round(sourcePos.x + sourceMinReach);
            if (verticalX2 < sourcePos.x + sourceMinReach)
                verticalX2 = Math.round(sourcePos.x + sourceMinReach);
            verticalX1 ??= Math.round(destPos.x - destMinReach);
            if (verticalX1 > destPos.x - destMinReach)
                verticalX1 = Math.round(destPos.x - destMinReach);
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
                    if (verticalX2 < destPos.x + 5)
                        verticalX2 = Math.round(destPos.x + 5);
                }
            }
            anchors.vertical1 = verticalX1;
            anchors.horizontal = horizontalY;
            anchors.vertical2 = verticalX2;
            return [
                vec2(destPos),
                vec2(verticalX1, destPos.y),
                vec2(verticalX1, horizontalY),
                vec2(verticalX2, horizontalY),
                vec2(verticalX2, sourcePos.y),
                vec2(sourcePos),
            ];
        }
    }
    generatePolylineSVGPointsList(path, collisionList = []) {
        let points = [...path];
        let collisions = [...collisionList];
        const joint = collisions.find(col => col.type == 'joint');
        if (joint) {
            console.log(collisions);
            points = points.slice(0, joint.point + 1);
            points[joint.point] = (joint.point % 2 == 0)
                ? vec2(points[joint.point].x, joint.pos.y)
                : vec2(joint.pos.x, points[joint.point].y);
            collisions = collisions.filter(col => col.point < points.length);
        }
        const crossings = collisions.filter(col => col.type == 'cross');
        const sections = (crossings)
            ? [points]
            : [points];
        const svgPointList = sections.map(section => {
            const scaledPoints = section.map(pos => Vec2.mul(pos, this.scale).add(this.cellOffset));
            const pointStrings = scaledPoints.map(pos => pos.x + ',' + pos.y);
            return pointStrings.join(' ');
        });
        return svgPointList;
    }
    updatePolylinePoints(trace, points) {
        const polylines = trace.polylines;
        const svgPointsList = this.generatePolylineSVGPointsList(points, trace.collisions);
        // Update or create trace polylines
        svgPointsList.forEach((svgPoints, i) => {
            if (polylines[i])
                polylines[i].setAttributeNS(null, 'points', svgPoints);
            else
                polylines[i] = this.createNewPolyline(trace.color, svgPoints);
        });
        // Trim excess polylines
        while (polylines.length > svgPointsList.length) {
            const polyline = polylines.pop();
            this.svg.removeChild(polyline);
        }
    }
    createNewPolyline(color, svgPoints) {
        const polyline = document.createElementNS(xmlns, 'polyline');
        const style = {
            fill: 'none',
            stroke: color,
            strokeWidth: this.traceWidth,
            pointerEvents: 'none',
        };
        // Line shadow. Does not work on straight horizontal line because effect bounds is relative to element size (def. -10%...120%)
        // const styleString = Object.entries(style).map(([key, value]) => `${key}: ${value};`).join(' ')
        // polyline.setAttribute('style', styleString)
        polyline.setAttribute('points', svgPoints);
        Object.assign(polyline.style, style);
        this.svg.appendChild(polyline);
        return polyline;
    }
    createPolylines(points, color, collisions = []) {
        const svgPointsList = this.generatePolylineSVGPointsList(points, collisions);
        const polylines = svgPointsList.map(svgPoints => this.createNewPolyline(color, svgPoints));
        return polylines;
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
