import Vec2, { vec2 } from '../Lib/Vector2.js'
import GUIView from '../GUI/GUIView.js'
import Circuit from '../State/Circuit.js'
import { GUIChildElement } from '../GUI/GUIChildElement.js'
import * as HTML from '../Lib/HTML.js'
import { IStyleGUI } from '../GUI/GUITypes.js'

interface DefaultStyle extends IStyleGUI {
    colors: {
        primary:    string
        secondary:  string
        light:      string
        dark:       string
        highlight:  string
        selection:  string
        background: string
    }
}

export default class CircuitView extends GUIView<GUIChildElement, DefaultStyle>
{
    constructor(parent: HTMLElement, size: Vec2, scale: Vec2, style: Readonly<DefaultStyle>)
    {
        super(parent, size, scale, style, {
            backgroundColor: style.colors.background,
            ...HTML.backgroundGridStyle(scale, style.colors.dark),
            fontFamily: 'system-ui',
            fontSize: Math.round(scale.y * style.fontSize)+'px'
        })
        
    }
}