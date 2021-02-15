import Vec2, { vec2 } from '../Lib/Vector2.js'
import GUIView from '../GUI/GUIView.js'
import Circuit from '../State/Circuit.js'
import { GUIChildElement } from '../GUI/GUIChildElement.js'
import * as HTML from '../Lib/HTML.js'

const defaultStyle =
{
    colors: {
        primary:    '#999',
        secondary:  '#77D',
        light:      '#DDD',
        dark:       '#666',
        highlight:  '#DDF',
        selection:  '#FFF',
        background: '#446'
    },
    fontSize: 0.8
}

type Style = typeof defaultStyle

export default class CircuitView extends GUIView<GUIChildElement, Style>
{
    constructor(parent: HTMLElement, size: Vec2, scale: Vec2, style: Readonly<Style> = defaultStyle)
    {
        super(parent, size, scale, style, {
            backgroundColor: style.colors.background,
            ...HTML.backgroundGridStyle(scale, style.colors.dark),
            fontFamily: 'system-ui',
            fontSize: Math.round(scale.y * style.fontSize)+'px'
        })
        
    }
}