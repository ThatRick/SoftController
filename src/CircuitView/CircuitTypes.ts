import { GUIChildElement } from '../GUI/GUIChildElement.js'
import CircuitView from './CircuitView.js'

export type ElementType = 
    'blockArea' | 'inputArea' | 'outputArea' | 
    'block' | 'circuitInput' | 'circuitOutput' |
    'inputPin' | 'outputPin' |
    'inputValue' | 'outputValue' |
    'traceSegment'

export type PinType = 'inputPin' | 'outputPin'

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
    colorGridLine:          string
    colorPanel:             string
    colorPanelLines:        string
    colorBlock:             string
    colorBlockHover:        string
    colorSelected:          string
    
    blockOutlineUnselected: string
    blockOutlineSelected:   string

    colorPinHover:          string
    colorPinBinary0:        string
    colorPinBinary1:        string
    colorPinInteger:        string
    colorPinFloat:          string
    pinValueFieldBg:        string
    
    filterDefault:          string
    filterActive:           string
    
    traceWidth:             number
    IOAreaWidth:            number
}

export const defaultStyle: CircuitStyle =
{
    colorBackground:        '#181820',
    colorGridLine:          '#202040',
    colorPanel:             '#202040',
    colorPanelLines:        '#303050',
    colorBlock:             '#447',
    colorBlockHover:        '#558',
    colorSelected:          '#AAF',
    
    blockOutlineUnselected: 'none',
    blockOutlineSelected:   'thin solid #AAF',

    colorPinHover:          '#AAA',
    colorPinBinary0:        '#666',
    colorPinBinary1:        '#CC9',
    colorPinInteger:        '#99D',
    colorPinFloat:          '#9D9',
    pinValueFieldBg:        'transparent',
    
    filterDefault:          'none',
    filterActive:           'brightness(150%)',
    
    traceWidth:             0.10,
    IOAreaWidth:            6
}