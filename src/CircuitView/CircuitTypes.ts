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

    onSelected?(): void
    onUnselected?(): void
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
    colorValueBg:           string
    colorCallIndex:         string
    colorCallIndexBg:       string
    
    filterDefault:          string
    filterActive:           string

    colorPending:           string
    borderPending:          string
    borderError:            string
    
    traceWidth:             number
    IOAreaWidth:            number
}

export const defaultStyle: CircuitStyle =
{
    colorBackground:        '#202020',
    colorGridLine:          '#252525',
    colorPanel:             '#282828',
    colorPanelLines:        '#333333',
    colorBlock:             '#447',
    colorBlockHover:        '#558',
    colorSelected:          '#AAF',
    
    blockOutlineUnselected: 'none',
    blockOutlineSelected:   'thin solid #AAF',

    colorPinHover:          '#AAA',
    colorPinBinary0:        '#777',
    colorPinBinary1:        '#CC9',
    colorPinInteger:        '#99D',
    colorPinFloat:          '#9D9',
    colorValueBg:           'transparent',
    colorCallIndex:         '#8AB',
    colorCallIndexBg:       'transparent', //'rgba(200, 255, 255, 0.1)',

    filterDefault:          'none',
    filterActive:           'brightness(150%)',

    colorPending:           'rgba(150, 255, 200, 0.15)',
    borderPending:          'none', //'thin solid rgba(255, 255, 200, 0.2)',
    borderError:            'thin solid rgba(255, 0, 0, 0.2)',
    
    traceWidth:             0.10,
    IOAreaWidth:            6
}