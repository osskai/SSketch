import SketchObject, {SEGMENT} from "@/web/sketches/shapes/object";
import TextHelper from "@/web/sketches/shapes/text";
import Sketcher from "@/web/sketches/sketcher";
import Vector from "@/web/math/vector";
import EndPoint from "@/web/sketches/shapes/point";
import {_normalize, cross2d, distance, dot} from "@/web/math/vec";
import {Styles} from "@/web/sketches/styles";
import {distanceAB, EPSILON} from "@/web/math/algebra";
import {findCenter, pointToLineSignedDistance} from "@/web/sketches/shapes/utils";
import Segment from "@/web/sketches/shapes/segment";
import {DEG_RAD, makeAngle0_360} from "@/web/math/space";
import layer from "@/web/sketches/layer";
import Layer from "@/web/sketches/layer";

const math = require('mathjs');


const ARROW_W_PX = 15;
const ARROW_H_PX = 4;
const ARROW_TO_TEXT_PAD_PX = 2;
const TEXT_H_OFFSET = 3;
const OUTER_ARROW_TO_TEXT_PAD_PX = 6;
const EXT_LINEAR_WIDTH_PX = 7;


function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, nx: number, ny: number,
                   arrowW: number, arrowH: number) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + ny * arrowW + nx * arrowH, y + -nx * arrowW + ny * arrowH);
    ctx.lineTo(x + ny * arrowW - nx * arrowH, y + -nx * arrowW - ny * arrowH);
    ctx.fill();
}

function drawExtensionLine(ctx: CanvasRenderingContext2D, x: number, y: number, nx: number, ny: number,
                           width: number, tip: Array<number>, arrowW: number) {
    ctx.beginPath();
    ctx.moveTo(x + ny * arrowW, y + -nx * arrowW);

    tip[0] = x + ny * (arrowW + width);
    tip[1] = y + -nx * (arrowW + width);

    ctx.lineTo(tip[0], tip[1]);

    ctx.stroke();
}

export default class Dimension extends SketchObject {

    public parents: Array<SketchObject>;

    constructor() {
        super();

        this.parents = [];
    }

    copy(): SketchObject {
        throw Error("Method not implemented.");
    }

    drawImpl(ctx: CanvasRenderingContext2D, scale: number, viewer: Sketcher): void {
    }

    referencePoint(): EndPoint | null {
        return null;
    }

    visitParams(callback: Function): void {
    }

    normalDistance(aim: Vector, scale: number): number {
        throw new Error("Method not implemented.");
    }

    synchronize(target: SketchObject, x: number, y: number) {
    }
}


export class LinearDimension extends Dimension {

    public a: EndPoint;
    public b: EndPoint;
    private _alignB: { x: number, y: number };
    private enableAlignB: boolean;
    public offset: number;

    private pickA: Array<number>;
    private pickB: Array<number>;
    private textHelper: TextHelper;

    private unscale: number;

    constructor(layer: Layer, a: EndPoint, b: Segment | EndPoint) {
        super();

        this.layer = layer;

        this.a = a;
        this.a.addDim(layer, this);

        if (b.class === SEGMENT) {
            const segment = b as Segment;
            this.b = segment.nearestPointToSegment(a)!;
            this.enableAlignB = false;
        } else {
            this.b = b as EndPoint;
            this.enableAlignB = true;
        }
        b.addDim(layer, this);

        this.parents = [a, b];

        this._alignB = {x: this.b.x, y: this.b.y};
        this.offset = 20;

        this.pickA = [];
        this.pickB = [];
        this.textHelper = new TextHelper();

        this.unscale = 1;

        this.__class = 'DIMENSION.Linear';
    }

    copy() {
        return new LinearDimension(this.layer!, this.a, this.b);
    }

    translateImpl(dx: number, dy: number) {
        const [_ax, _ay] = this.pickA;
        const [_bx, _by] = this.pickB;

        let _vx = -(_by - _ay);
        let _vy = _bx - _ax;

        const d = distance([_ax, _ay], [_bx, _by]);

        let _vxn = _vx / d;
        let _vyn = _vy / d;

        this.offset += (dx * _vxn + dy * _vyn) * this.unscale;
    }

    getA() {
        return this.a;
    }

    getB() {
        if (this.enableAlignB) {
            return this._alignB;
        }
        return this.b;
    }

    set alignB(value: any) {
        this._alignB.x = value.x;
        this._alignB.y = value.y;
    }

    synchronize(target: SketchObject, x: number, y: number) {
        if (target.nodeId === this.b.nodeId) {
            if (this.enableAlignB) {
                this._alignB.x = x;
                this._alignB.y = y;
            }
        } else {
            if (target.parent !== null && target.parent.class === SEGMENT) {
                if (!this.enableAlignB) {
                    const segment = this.b.parent as Segment;
                    this.b = segment.nearestPointToSegment(this.a)!;
                }
            }
        }
    }

    drawImpl(ctx: CanvasRenderingContext2D, scale: number, viewer: Sketcher) {
        const marked = this.markers.length !== 0;
        if (marked) {
            ctx.save();
            viewer.setStyle(Styles.HIGHLIGHT, ctx);
        }

        const unscale = 1 / scale;
        const off = unscale * this.offset;
        const textOff = unscale * TEXT_H_OFFSET;

        this.unscale = scale;

        const a = this.getB();
        const b = this.getA();
        const startA = this.b;
        const startB = this.a;

        const d = distanceAB(Vector.createFromArray([a.x, a.y, 0]), b.toVector());
        if (math.smaller(math.abs(d), EPSILON)) return;

        let _vx = -(b.y - a.y);
        let _vy = b.x - a.x;

        //normalize
        let _vxn = _vx / d;
        let _vyn = _vy / d;

        _vx = _vxn * off;
        _vy = _vyn * off;

        ctx.beginPath();

        let _ax = a.x + _vx;
        let _ay = a.y + _vy;
        let _bx = b.x + _vx;
        let _by = b.y + _vy;

        ctx.moveTo(_ax, _ay);
        ctx.lineTo(_bx, _by);


        function drawRef(start: EndPoint, x: number, y: number) {
            let vec = new Vector(x - start.x, y - start.y);
            vec._normalize();
            vec._multiply(EXT_LINEAR_WIDTH_PX * unscale);

            ctx.moveTo(start.x, start.y);
            ctx.lineTo(x, y);
            ctx.lineTo(x + vec.x, y + vec.y);
        }

        drawRef(startA, _ax, _ay);
        drawRef(startB, _bx, _by);

        ctx.stroke();

        const arrowWpx = ARROW_W_PX;
        const arrowW = arrowWpx * unscale;
        const arrowH = ARROW_H_PX * unscale;

        const txt = d.toFixed(2);

        this.textHelper.prepare(txt, ctx, viewer);
        const takenByArrow = viewer.screenToModelDistance(2 * (arrowWpx + ARROW_TO_TEXT_PAD_PX));
        const availableArea = d - takenByArrow;
        const modelTextWidth = this.textHelper.modelTextWidth;

        const innerMode = modelTextWidth <= availableArea;

        let tx, ty;
        if (innerMode) {
            drawArrow(ctx, _ax, _ay, _vxn, _vyn, arrowW, arrowH);
            drawArrow(ctx, _bx, _by, -_vxn, -_vyn, arrowW, arrowH);

            this.pickA[0] = _ax;
            this.pickA[1] = _ay;
            this.pickB[0] = _bx;
            this.pickB[1] = _by;

            const h = d / 2 - modelTextWidth / 2;
            tx = (_ax + _vxn * textOff) - (-_vyn) * h;
            ty = (_ay + _vyn * textOff) - (_vxn) * h;
        } else {
            drawArrow(ctx, _ax, _ay, -_vxn, -_vyn, arrowW, arrowH);
            drawArrow(ctx, _bx, _by, _vxn, _vyn, arrowW, arrowH);

            drawExtensionLine(ctx, _ax, _ay, -_vxn, -_vyn, OUTER_ARROW_TO_TEXT_PAD_PX * unscale, this.pickA, arrowW);
            drawExtensionLine(ctx, _bx, _by, _vxn, _vyn, modelTextWidth + 2 * OUTER_ARROW_TO_TEXT_PAD_PX * unscale, this.pickB, arrowW);

            tx = (_bx + _vxn * textOff) - (-_vyn) * (arrowWpx + OUTER_ARROW_TO_TEXT_PAD_PX) * unscale;
            ty = (_by + _vyn * textOff) - (_vxn) * (arrowWpx + OUTER_ARROW_TO_TEXT_PAD_PX) * unscale;
        }

        this.textHelper.draw(tx, ty, _vxn, _vyn, ctx, unscale, viewer, textOff);

        if (marked) {
            ctx.restore();
        }

    }

    normalDistance(aim: Vector, scale: number) {
        const textDist = this.textHelper.normalDistance(aim);
        if (textDist !== -1) {
            return textDist;
        }

        const [_ax, _ay] = this.pickA;
        const [_bx, _by] = this.pickB;

        const sdist = pointToLineSignedDistance(_ax, _ay, _bx, _by, aim.x, aim.y);
        if (sdist !== sdist) {
            return -1;
        }

        return Math.abs(sdist);
    }

    referencePoint() {
        return this.a;
    }
}

function drawArrowForArc(ctx: CanvasRenderingContext2D, px: number, py: number,
                         x: number, y: number, nx: number, ny: number, arrowW: number, arrowH: number) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(px + nx * arrowH, py + ny * arrowH);
    ctx.lineTo(px - nx * arrowH, py - ny * arrowH);
    ctx.fill();
}


export class AngleDimension extends Dimension {

    private readonly a: Segment;
    private readonly b: Segment;
    public offset: number;
    private textHelper: TextHelper;
    private pickInfo: Array<any>;
    public configuration: Array<EndPoint>;
    private center: null | Array<number>;

    constructor(layer: layer, a: Segment, b: Segment) {
        super();

        this.layer = layer;

        this.a = a;
        this.a.addDim(layer, this);

        this.b = b;
        this.b.addDim(layer, this);

        this.parents = [a, b];

        this.offset = 20;
        this.textHelper = new TextHelper();
        this.configuration = [this.a.a, this.a.b, this.b.a, this.b.b];
        this.pickInfo = [];

        this.center = null;

        this.__class = 'DIMENSION.Angular';
    }

    get dimA() {
        return this.a;
    }

    get dimB() {
        return this.b;
    }

    copy() {
        return new AngleDimension(this.layer!, this.a, this.b);
    }

    referencePoint() {
        return this.a.a;
    }

    translateImpl(dx: number, dy: number) {
        if (this.pickInfo !== null) {
            const [cx, cy, ax, ay, bx, by, rad] = this.pickInfo;

            let _vx = -(by - ay);
            let _vy = bx - ax;

            const d = distance([ax, ay], [bx, by]);

            let _vxn = _vx / d;
            let _vyn = _vy / d;

            this.offset -= (dx * _vxn + dy * _vyn);
        }
    }

    drawImpl(ctx: CanvasRenderingContext2D, scale: number, viewer: Sketcher) {
        const marked = this.markers.length !== 0;
        if (marked) {
            ctx.save();
            viewer.setStyle(Styles.HIGHLIGHT, ctx);
        }
        this.drawDimension(ctx, scale, viewer);
        if (marked) ctx.restore();
    }

    drawDimension(ctx: CanvasRenderingContext2D, scale: number, viewer: Sketcher) {
        const unscale = 1 / scale;
        let off = this.offset;
        const MIN_OFFSET_PX = 20;
        if (off * scale < MIN_OFFSET_PX) {
            off = MIN_OFFSET_PX * unscale;
        }
        const textOff = unscale * TEXT_H_OFFSET;

        let [aa, ab, ba, bb] = this.configuration;

        let aAng = makeAngle0_360(Math.atan2(ab.y - aa.y, ab.x - aa.x));
        let bAng = makeAngle0_360(Math.atan2(bb.y - ba.y, bb.x - ba.x));
        let ang = makeAngle0_360(bAng - aAng);
        if (ang > Math.PI) {
            this.configuration.reverse();
            [aa, ab, ba, bb] = this.configuration;
            aAng = makeAngle0_360(Math.atan2(ab.y - aa.y, ab.x - aa.x));
            bAng = makeAngle0_360(Math.atan2(bb.y - ba.y, bb.x - ba.x));
            ang = makeAngle0_360(bAng - aAng);
        }

        let avx = Math.cos(aAng);
        let avy = Math.sin(aAng);
        let bvx = Math.cos(bAng);
        let bvy = Math.sin(bAng);


        this.center = findCenter(aa, ab, ba, bb, avx, avy, bvx, bvy);
        if (!this.center) {
            return;
        }

        const [cx, cy] = this.center;

        const halfAng = 0.5 * ang;

        let _ax = cx + off * avx;
        let _ay = cy + off * avy;
        let _bx = cx + off * bvx;
        let _by = cy + off * bvy;


        const _vxn = Math.cos(aAng + halfAng);
        const _vyn = Math.sin(aAng + halfAng);

        const mx = cx + off * _vxn;
        const my = cy + off * _vyn;

        const arrowW = ARROW_W_PX * unscale;
        const arrowH = ARROW_H_PX * unscale;

        const txt = (1 / DEG_RAD * ang).toFixed(2) + '°';

        this.textHelper.prepare(txt, ctx, viewer);

        let sinPhi = arrowW / off;
        const cosPhi = Math.sqrt(1 - sinPhi * sinPhi);

        if (cosPhi !== cosPhi) {
            return;
        }

        let arrLxV = avx * cosPhi - avy * sinPhi;
        let arrLyV = avx * sinPhi + avy * cosPhi;

        let arrLx = cx + off * (arrLxV);
        let arrLy = cy + off * (arrLyV);

        sinPhi *= -1;

        let arrRxV = bvx * cosPhi - bvy * sinPhi;
        let arrRyV = bvx * sinPhi + bvy * cosPhi;

        let arrRx = cx + off * (arrRxV);
        let arrRy = cy + off * (arrRyV);


        const availableArea = distance([arrLx, arrLy], [arrRx, arrRy]);
        const modelTextWidth = this.textHelper.modelTextWidth;
        const innerMode = ang > Math.PI || modelTextWidth <= availableArea;

        let tx, ty;
        if (innerMode) {
            ctx.beginPath();
            ctx.arc(cx, cy, off, Math.atan2(arrLyV, arrLxV), Math.atan2(arrRyV, arrRxV));
            ctx.stroke();

            drawArrowForArc(ctx, arrLx, arrLy, _ax, _ay, -arrLxV, -arrLyV, arrowW, arrowH);
            drawArrowForArc(ctx, arrRx, arrRy, _bx, _by, arrRxV, arrRyV, arrowW, arrowH);

            const h = modelTextWidth / 2;
            tx = (mx + _vxn * textOff) + (-_vyn) * h;
            ty = (my + _vyn * textOff) + (_vxn) * h;
            this.textHelper.draw(tx, ty, _vxn, _vyn, ctx, unscale, viewer, textOff, true);
        } else {
            ctx.beginPath();
            ctx.arc(cx, cy, off, aAng, bAng);
            ctx.stroke();

            //sin is inverted by this time

            arrLxV = avx * cosPhi - avy * sinPhi;
            arrLyV = avx * sinPhi + avy * cosPhi;

            arrLx = cx + off * (arrLxV);
            arrLy = cy + off * (arrLyV);

            sinPhi *= -1;

            arrRxV = bvx * cosPhi - bvy * sinPhi;
            arrRyV = bvx * sinPhi + bvy * cosPhi;

            arrRx = cx + off * (arrRxV);
            arrRy = cy + off * (arrRyV);

            drawArrowForArc(ctx, arrLx, arrLy, _ax, _ay, -arrLxV, -arrLyV, arrowW, arrowH);
            drawArrowForArc(ctx, arrRx, arrRy, _bx, _by, arrRxV, arrRyV, arrowW, arrowH);

            const longExt = modelTextWidth + 2 * OUTER_ARROW_TO_TEXT_PAD_PX * unscale;
            const shortExt = OUTER_ARROW_TO_TEXT_PAD_PX * unscale;

            ctx.beginPath();
            ctx.moveTo(arrLx, arrLy);
            ctx.lineTo(arrLx + arrLyV * shortExt, arrLy - arrLxV * shortExt);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(arrRx, arrRy);
            ctx.lineTo(arrRx - arrRyV * longExt, arrRy + arrRxV * longExt);
            ctx.stroke();


            tx = arrRx + (-arrRyV) * OUTER_ARROW_TO_TEXT_PAD_PX * unscale - arrRxV * textOff;
            ty = arrRy + (arrRxV) * OUTER_ARROW_TO_TEXT_PAD_PX * unscale - arrRyV * textOff;

            this.textHelper.draw(tx, ty, -arrRxV, -arrRyV, ctx, unscale, viewer, textOff, false);
        }

        this.setPickInfo(cx, cy, _ax, _ay, _bx, _by, off);

        this.drawRef(ctx, aa, ab, _ax, _ay, avx, avy, viewer, unscale, true);
        this.drawRef(ctx, ba, bb, _bx, _by, bvx, bvy, viewer, unscale, false);
    }

    drawRef(ctx: CanvasRenderingContext2D, a: EndPoint, b: EndPoint,
            px: number, py: number, vx: number, vy: number,
            viewer: Sketcher, unscale: number, first: boolean) {
        const abx = b.x - a.x;
        const aby = b.y - a.y;

        const apx = px - a.x;
        const apy = py - a.y;

        const dot = abx * apx + aby * apy;
        if (dot < 0) {
            ctx.save();
            viewer.setStyle(Styles.CONSTRUCTION, ctx);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(px - vx * 10 * unscale, py - vy * 10 * unscale);
            ctx.stroke();
            ctx.restore();
        } else if (apx * apx + apy * apy > abx * abx + aby * aby) {
            ctx.save();
            viewer.setStyle(Styles.CONSTRUCTION, ctx);
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(px + vx * 10 * unscale, py + vy * 10 * unscale);
            ctx.stroke();
            ctx.restore();
        }
    }

    setPickInfo(cx: number, cy: number, ax: number, ay: number, bx: number, by: number, rad: number) {
        for (let i = 0; i < arguments.length; ++i) {
            this.pickInfo[i] = arguments[i];
        }
    }

    normalDistance(aim: Vector, scale: number): number {
        const textDist = this.textHelper.normalDistance(aim);
        if (textDist !== -1) {
            return textDist;
        }

        if (this.pickInfo.length === 0) {
            return Number.MAX_VALUE;
        }

        const [cx, cy, ax, ay, bx, by, rad] = this.pickInfo;

        function isPointInsideSector(x: number, y: number) {
            const ca = [ax - cx, ay - cy];
            const cb = [bx - cx, by - cy];
            const ct = [x - cx, y - cy];

            _normalize(ca);
            _normalize(cb);
            _normalize(ct);
            const cosAB = dot(ca, cb);
            const cosAT = dot(ca, ct);

            const isInside = cosAT >= cosAB;
            const abInverse = cross2d(ca, cb) < 0;
            const atInverse = cross2d(ca, ct) < 0;

            let result;
            if (abInverse) {
                result = !atInverse || !isInside;
            } else {
                result = !atInverse && isInside;
            }
            return result;
        }

        const isInsideSector = isPointInsideSector(aim.x, aim.y);
        if (isInsideSector) {
            return Math.abs(distance([aim.x, aim.y], [cx, cy]) - rad);
        } else {
            return Math.min(
                distance([aim.x, aim.y], [ax, ay]),
                distance([aim.x, aim.y], [bx, by])
            );
        }
    }
}
