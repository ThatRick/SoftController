import { GUIChildElement } from '../GUI/GUIChildElement.js'
import CircuitView from './CircuitView.js'

export type ElementType = 
    'blockArea' | 'inputArea' | 'outputArea' | 
    'block' | 'input' | 'output' | 'inputValue' | 'outputValue' |
    'traceSegment'

export type PinType = 'input' | 'output'

export interface CircuitElement extends GUIChildElement
{
    type:   ElementType
    id:     number
    gui:    CircuitView

    selected?(): void
    unselected?(): void
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
    traceWidth:             number
    colorTraceSelected:     string
    IOAreaWidth:            number
}

export const defaultStyle: CircuitStyle =
{
    colorBackground:        '#101030',
    colorBlock:             '#447',
    colorBlockHover:        '#558',
    blockOutlineUnselected: 'none',
    blockOutlineSelected:   'thin solid #AAF',
    colorPinHover:          '#AAA',
    colorPinBinary0:        '#666',
    colorPinBinary1:        '#CC9',
    colorPinInteger:        '#99D',
    colorPinFloat:          '#9D9',
    pinValueFieldBg:        'transparent',
    colorFilterDefault:     'none',
    colorFilterActive:      'brightness(150%)',
    traceWidth:             0.10,
    colorTraceSelected:     '#AAF',
    IOAreaWidth:            6
}