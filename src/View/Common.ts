
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
        float:                  '#80A080',
        integer:                '#88A',
        binary:                 '#AAA',
        binaryOff:              '#887',
        binaryOn:               '#DDB',
        connectionLine:         'rgba(192, 192, 192, 0.6)',
        connectionLineValid:    'rgba(128, 255, 128, 0.8)',
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
    let [ints, decs] = value.toString().split('.')
    if (!decs) return value.toString()
    const numDesimals = Math.min(decs.length, maxLength - (ints.length + 1))
    return Number(value.toFixed(numDesimals)).toString()
}