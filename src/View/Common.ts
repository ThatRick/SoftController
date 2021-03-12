
export const defaultStyle =
{
    colors: {
        primary:    '#999',
        primaryHL:  '#AAA',
        secondary:  '#77D',
        light:      '#DDD',
        dark:       '#666',
        highlight:  '#FFF',
        selection:  '#DDF',
        pinSelection: 'rgba(240, 240, 255, 0.2)',
        pinHighlight: 'rgba(240, 240, 255, 0.1)',
        background: '#505060',
        gridLines:  '#555565',
        float:      '#8A8',
        integer:    '#88A',
        binary:     '#AAA',
        binaryOff:  '#888',
        binaryOn:   '#CC9',
        connectionLine: 'rgba(192, 192, 192, 0.6)',
        connectionLineValid: 'rgba(128, 255, 128, 0.8)',
    },
    fontSize: 0.8,
    traceWidth: 0.125,
    crossingGap: 0.2
}

export type Style = typeof defaultStyle
