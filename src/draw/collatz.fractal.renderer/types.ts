export interface CollatzFractalRendererOptions {
    maxIter?: number;
    zoomSpeed?: number;
    colorSpeed?: number;
    morphSpeed?: number;
    morphRadius?: number;
    initialCenter?: [number, number];
    initialZoom?: number;
    zoomTarget?: [number, number];
    backgroundColor?: number;
}
