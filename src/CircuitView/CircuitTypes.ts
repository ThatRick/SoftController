import GUIElement from '../GUI/GUIChildElement.js'
import CircuitView from './CircuitView.js'

export type ElementType = 'block' | 'input' | 'output' | 'traceSegment' | 'inputValue' | 'outputValue'

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
    blockOutlineUnselected: string
    blockOutlineSelected:   string
    colorPinHover:          string
    colorPinBinary0:        string
    colorPinBinary1:        string
    colorPinInteger:        string
    colorPinFloat:          string
    pinValueFieldBg:        string
    colorFilterDefault:     string
    colorFilterActive:      string
}

export const defaultStyle: CircuitStyle =
{
    colorBackground:        '#224',
    colorBlock:             '#447',
    colorBlockHover:        '#558',
    blockOutlineUnselected: 'none',
    blockOutlineSelected:   'thin solid #AAF',
    colorPinHover:          '#AAA',
    colorPinBinary0:        '#888',
    colorPinBinary1:        '#BB9',
    colorPinInteger:        '#99D',
    colorPinFloat:          '#9D9',
    pinValueFieldBg:        'transparent',
    colorFilterDefault:     'none',
    colorFilterActive:      'brightness(150%)'
}