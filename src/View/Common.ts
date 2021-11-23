
export const defaultStyle =
{
    colors: {
        primary:                '#999',
        primaryHL:              '#AAA',
        secondary:              '#77D',
        light:                  '#DDD',
        dark:                   '#666',
        highlight:              '#FFF',
        selection:              '#DDF',
        pinSelection:           'rgba(240, 240, 255, 0.2)',
        pinHighlight:           'rgba(240, 240, 255, 0.1)',
        background:             '#505060',
        IOAreaBackground:       '#606070',
        gridLines:              '#555565',
        float:                  '#90B090',
        integer:                '#88E',
        binary:                 '#AAA',
        binaryOff:              '#887',
        binaryOn:               '#DDB',
        connectionLine:         'rgba(192, 192, 192, 0.6)',
        connectionLineValid:    'rgba(128, 255, 128, 0.8)',
        callIndex:              '#AAC',
        callIndexBackground:    '#334'
    },

    fontSize:               0.8,

    traceWidth:             0.125,
    traceDotSize:           0.2,
    traceCrossingGap:       0.25,

    valueFieldHeight:       0.7,
    valueFieldyOffset:     -0.3,
    valueFieldxOffset:      0.3,

    showBinaryValue:        false
}

export type Style = typeof defaultStyle

export function formatValue(value: number, maxLength = 8)
{
    const str = value.toString()
    if (str.length <= maxLength) return str

    const [ints, decs] = str.split('.')
    if (!decs) {
        if (ints.length > maxLength) return value.toExponential(maxLength-5)
        return value.toString()
    }
    if (ints.length >= maxLength) {
        return value.toExponential(maxLength-5)
    }
    const numDesimals = Math.max(Math.min(decs.length, maxLength - ints.length - 2), 0)
    return Number(value.toFixed(numDesimals)) + '~'
}