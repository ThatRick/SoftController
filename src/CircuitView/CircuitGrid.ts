import Grid from '../Lib/Grid.js'
import {Trace} from './TraceLayer.js'
import Vec2, {vec2} from '../Lib/Vector2.js'

type ID = number

export interface GridCell {
    block?: ID
    verticalTrace?: ID
    horizontalTrace?: ID
}

export default class CircuitGrid
{
    grid = new Grid<GridCell>()

    
}