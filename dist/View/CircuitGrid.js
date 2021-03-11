import Grid from '../Lib/Grid.js';
import { vec2 } from '../Lib/Vector2.js';
import * as HTML from '../Lib/HTML.js';
const DEBUG = false;
export default class CircuitGrid {
    constructor(circuit) {
        this.circuit = circuit;
        this.visualMap = HTML.domElement(circuit.DOMElement, 'canvas', {
            position: 'absolute',
            width: '100%',
            height: '100%',
            imageRendering: 'pixelated'
        });
        this.visualMap.width = circuit.size.x;
        this.visualMap.height = circuit.size.y;
        this.ctx = this.visualMap.getContext('2d');
    }
    resize() {
        this.visualMap.width = this.circuit.size.x;
        this.visualMap.height = this.circuit.size.y;
        this.visualize();
    }
    visualize() {
        if (!this.grid)
            return;
        const lineColors = {
            horizontal: '#080',
            vertical: '#008',
            corner: '#044',
        };
        const blockColor = '#404';
        const collisionColors = {
            'cross': '#000',
            'joint': '#880',
            'overlap trace': '#800',
            'overlap block': '#622',
        };
        this.ctx.clearRect(0, 0, this.visualMap.width, this.visualMap.height);
        this.grid.cells.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell) {
                    const color = (cell.type == 0 /* Block */) ? blockColor
                        : lineColors[cell.direction];
                    this.ctx.fillStyle = color;
                    this.ctx.fillRect(x, y, 1, 1);
                }
            });
        });
        this.circuit.traceLines.forEach(traceLine => {
            traceLine.route.collisions.forEach(collision => {
                const { type, pos } = collision;
                const color = collisionColors[type];
                this.ctx.fillStyle = color;
                this.ctx.fillRect(pos.x, pos.y, 1, 1);
            });
        });
    }
    update() {
        this.grid = new Grid();
        // Map function blocks
        this.circuit.blockViews.forEach(block => {
            this.grid.fillRect(block.pos, block.size, { type: 0 /* Block */, elem: block });
        });
        // Map horizontal line segments
        this.circuit.traceLines.forEach(traceLine => {
            traceLine.route.collisions = [];
            const points = traceLine.route.points;
            const cell = { type: 1 /* Trace */, elem: traceLine, direction: 'horizontal' };
            for (let i = 1; i < points.length; i += 2) {
                // Map horizontal line
                const results = this.mapHorizontalLine(points[i - 1], points[i], cell, i);
                // If no collision, mark corners
                if (results.length == 0 && (i == 3 || i == 5)) {
                    this.grid.setCell(points[i - 1], { type: 1 /* Trace */, elem: traceLine, direction: 'corner' });
                }
                if (results.length == 0 && (i == 1 || i == 3 && points.length == 6)) {
                    this.grid.setCell(points[i], { type: 1 /* Trace */, elem: traceLine, direction: 'corner' });
                }
                traceLine.route.collisions.push(...results);
            }
        });
        // Map vertical line segments
        this.circuit.traceLines.forEach(traceLine => {
            const points = traceLine.route.points;
            const cell = { type: 1 /* Trace */, elem: traceLine, direction: 'vertical' };
            for (let i = 2; i < points.length - 1; i += 2) {
                // Map vertical line
                const results = this.mapVerticalLine(points[i - 1], points[i], cell, i);
                traceLine.route.collisions.push(...results);
            }
            // Sort collisions by point number
            traceLine.route.collisions.sort((a, b) => a.point - b.point);
            traceLine.route.collisions.map;
        });
        this.visualize();
        this.circuit.traceLayer.update();
    }
    mapHorizontalLine(a, b, cell, pointNum) {
        const collisions = [];
        console.assert(a.y == b.y, 'Invalid points for horizontal line:', a, b);
        const y = a.y;
        this.grid.cells[y] ??= [];
        if (a.x < b.x) {
            for (let x = a.x; x <= b.x; x++) {
                const collision = this.mapHorizontalLineCell(x, y, cell, pointNum);
                if (collision)
                    collisions.push(collision);
            }
        }
        else {
            for (let x = a.x; x >= b.x; x--) {
                const collision = this.mapHorizontalLineCell(x, y, cell, pointNum);
                if (collision)
                    collisions.push(collision);
            }
        }
        return collisions;
    }
    mapHorizontalLineCell(x, y, cell, pointNum) {
        DEBUG && console.info('map horizontal line cell', x, y);
        const target = this.grid.cells[y][x];
        // Collide with another line
        if (target?.type == 1 /* Trace */) {
            const targetHasCommonSource = (target.elem.sourcePinView == cell.elem.sourcePinView);
            return {
                type: (targetHasCommonSource) ? 'joint' : 'overlap trace',
                target: target.elem,
                point: pointNum,
                pos: vec2(x, y),
            };
        }
        // Collide with block
        else if (target?.type == 0 /* Block */) {
            return {
                type: 'overlap block',
                target: target.elem,
                point: pointNum,
                pos: vec2(x, y),
            };
        }
        else
            this.grid.cells[y][x] = cell;
    }
    mapVerticalLine(a, b, cell, pointNum) {
        const collisions = [];
        console.assert(a.x == b.x, 'Invalid points for vertical line:', a, b);
        const x = a.x;
        if (Math.abs(a.y - b.y) < 2)
            return [];
        if (a.y < b.y) {
            for (let y = a.y + 1; y < b.y; y++) {
                this.grid.cells[y] ??= [];
                const collision = this.mapVerticalLineCell(x, y, cell, pointNum);
                if (collision)
                    collisions.push(collision);
            }
        }
        else {
            for (let y = a.y - 1; y > b.y; y--) {
                this.grid.cells[y] ??= [];
                const collision = this.mapVerticalLineCell(x, y, cell, pointNum);
                if (collision)
                    collisions.push(collision);
            }
        }
        return collisions;
    }
    mapVerticalLineCell(x, y, cell, pointNum) {
        DEBUG && console.info('map vertical line cell', x, y);
        const target = this.grid.cells[y][x];
        // Collide with another line
        if (target?.type == 1 /* Trace */) {
            const targetHasCommonSource = (target.elem.sourcePinView == cell.elem.sourcePinView);
            const targetIsHorizontal = (target.direction == 'horizontal');
            const type = (targetHasCommonSource) ? 'joint'
                : (targetIsHorizontal) ? 'cross'
                    : 'overlap trace';
            return {
                type,
                target: target.elem,
                point: pointNum,
                pos: vec2(x, y),
            };
        }
        // Collide with block
        else if (target?.type == 0 /* Block */) {
            return {
                type: 'overlap block',
                target: target.elem,
                point: pointNum,
                pos: vec2(x, y),
            };
        }
        else
            this.grid.cells[y][x] = cell;
    }
}
