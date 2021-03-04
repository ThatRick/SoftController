
export const defaultStyle =
{
    colors: {
        primary:    '#999',
        secondary:  '#77D',
        light:      '#DDD',
        dark:       '#666',
        highlight:  '#FFF',
        selection:  '#DDF',
        pinSelection: 'rgb(240, 240, 255, 0.2)',
        background: '#505060',
        gridLines:  '#555565',
        float:      '#8A8',
        integer:    '#88A',
        binary:     '#AAA',
        binaryOff:  '#888',
        binaryOn:   '#CC9',
    },
    fontSize: 0.8,
    traceWidth: 0.15
}

export type Style = typeof defaultStyle
