import GUIElement from '../GUI/GUIElement.js'

export type ElementType = 'block' | 'input' | 'output' | 'traceSegment'

export type PinType = 'input' | 'output'

export interface CircuitElement extends GUIElement
{
    type:   ElementType
    id:     number
}

export interface CircuitStyle
{
    colorBackground:    string
    colorBlock:         string
    colorBlockHover:    string
    colorPin:           string
    colorPinHover:      string
}

export const defaultStyle: CircuitStyle =
{
    colorBackground:    '#224',
    colorBlock:         '#446',
    colorBlockHover:    '#556',
    colorPin:           '#555',
    colorPinHover:      '#666',
}