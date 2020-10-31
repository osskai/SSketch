import Vector from './vector';

const math = require('mathjs');

export function computePolygonArea(points: Array<Vector>) {
    const num = points.length;
    if (num < 3) return 0.0;

    let s = points[0].y * (points[num - 1].x - points[1].x);
    for (let i = 1; i < num; ++i) {
        s += points[i].y * (points[i - 1].x - points[(i + 1) % num].x);
    }

    return math.abs(s / 2.0);
}