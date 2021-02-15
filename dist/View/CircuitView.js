import GUIView from '../GUI/GUIView.js';
import * as HTML from '../Lib/HTML.js';
const defaultStyle = {
    colors: {
        primary: '#999',
        secondary: '#77D',
        light: '#DDD',
        dark: '#666',
        highlight: '#DDF',
        selection: '#FFF',
        background: '#446'
    },
    fontSize: 0.8
};
export default class CircuitView extends GUIView {
    constructor(parent, size, scale, style = defaultStyle) {
        super(parent, size, scale, style, {
            backgroundColor: style.colors.background,
            ...HTML.backgroundGridStyle(scale, style.colors.dark),
            fontFamily: 'system-ui',
            fontSize: Math.round(scale.y * style.fontSize) + 'px'
        });
    }
}
