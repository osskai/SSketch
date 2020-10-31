import EndPoint from "@/web/sketches/shapes/point";


declare global {
    interface CanvasRenderingContext2D {
        //@ts-ignore
        curve(points: Array<EndPoint>, tension: number = 0.5, numOfSeg: number = 20, closed: boolean = false): Array<number>;
    }
}

export {};
