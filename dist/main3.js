import { DataViewer } from './DataViewer/DataViewer.js';
//////////////////////////
//  PROGRAM ENTRY POINT
//
window.onload = () => app();
function app() {
    const dummyData = new Uint16Array([...Array(2048)].map((_, i) => i));
    const viewer = new DataViewer(document.getElementById('dataviewer'));
    viewer.setData(dummyData.buffer);
}
