import GUIElement from '../GUI/GUIElement.js'
import CircuitView from './CircuitView.js'

export type ElementType = 'block' | 'input' | 'output' | 'traceSegment'

export type PinType = 'input' | 'output'

export interface CircuitElement extends GUIElement
{
    type:   ElementType
    id:     number
    gui:    CircuitView

    selected(): void
    unselected(): void
}

export interface CircuitStyle
{
    colorBackground:        string
    colorBlock:             string
    colorBlockHover:        string
    blockOutlineUnselected: string,
    blockOutlineSelected:   string,
    colorPin:               string
    colorPinHover:          string
}

export const defaultStyle: CircuitStyle =
{
    colorBackground:        '#224',
    colorBlock:             '#447',
    colorBlockHover:        '#558',
    blockOutlineUnselected: 'none',
    blockOutlineSelected:   'thin solid #AAF',
    colorPin:               '#777',
    colorPinHover:          '#999',
}