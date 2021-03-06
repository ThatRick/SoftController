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

export const defaultStyle =
{
    colorBackground:        '#202020',
    colorGridLine:          '#252525',
    colorPanel:             '#282828',
    colorPanelLines:        '#333333',
    colorBlock:             '#445',
    colorBlockOnline:       '#446',
    colorBlockHover:        '#668',
    colorSelected:          '#AAF',
    
    blockOutlineUnselected: 'none',
    blockOutlineSelected:   'thin solid #AAF',

    colorPinHover:          '#AAA',
    colorPinBinary0:        '#777',
    colorPinBinary1:        '#CC9',
    colorPinInteger:        '#88A',
    colorPinFloat:          '#8A8',
    colorValueBg:           'rgba(32, 32, 32, 0.5)',
    colorCallIndex:         '#8AB',
    colorOfflineID:         '#AAA',
    colorOnlineID:          '#88F',

    filterDefault:          'none',
    filterActive:           'brightness(150%)',

    colorPending:           'rgba(150, 255, 200, 0.2)',
    borderPending:          'thin solid rgba(255, 255, 200, 0.3)',
    borderError:            'thin solid rgba(255, 0, 0, 0.2)',
    
    fontSize:               0.6,
    traceWidth:             0.10,
    IOAreaWidth:            6,

    valueFieldHeight:       0.7,
    valueFieldyOffset:     -0.3,
    valueFieldxOffset:      0.4
}

export type CircuitStyle = typeof defaultStyle