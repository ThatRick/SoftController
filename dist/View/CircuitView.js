import GUIView from '../GUI/GUIView.js';
import * as HTML from '../Lib/HTML.js';
export default class CircuitView extends GUIView {
    constructor(parent, size, scale, style) {
        super(parent, size, scale, style, {
            backgroundColor: style.colors.background,
            ...HTML.backgroundGridStyle(scale, style.colors.dark),
            fontFamily: 'system-ui',
            fontSize: Math.round(scale.y * style.fontSize) + 'px'
        });
    }
}
