<template>
    <div id="sketch" class="sketch-container">
        <div class="inner draw">
            <div class="wrap">
                <span style="background-color: lightgray">{{sketchName}}</span>
                <canvas id="canvas" width="600" height="400"></canvas>
            </div>
            <div id="control" class="fl">
                <div id="canvas-tool">
                    <h5>Tools</h5>
                    <span v-for="tool in tools" :key="tool.id"
                          :title="tool.title"
                          :class="[{'active': curToolName === tool.title}, tool.className]"
                          @click="setTool(tool.action)"
                    ></span>
                </div>
                <div id="canvas-constraint">
                    <h5>Constraints</h5>
                    <span v-for="constraint in constraints" :key="constraint.id"
                          :title="constraint.title"
                          :class="[{'active': curConstraint === constraint.title}, constraint.className]"
                          @mouseover="curConstraint = constraint.title"
                          @mouseout="curConstraint = 'None'"
                          @click="addConstraint(constraint.action)"
                    ></span>
                </div>
                <div id="canvas-analysis">
                    <h5>Analysis</h5>
                    <span v-for="tool in analysis" :key="tool.id"
                          :title="tool.title"
                          :class="[{'active': curToolName === tool.title}, tool.className]"
                          @click="setTool(tool.action)"
                    ></span>
                </div>
                <div id="canvas-control">
                    <h5>Operations</h5>
                    <span v-for="control in controls" :key="control.id"
                          :title="control.title"
                          :class="control.className"
                          @click="controlCanvas(control.action)"
                    ></span>
                </div>
                <div id="canvas-io">
                    <h5>System</h5>
                    <button @click="newSketch">
                        New
                    </button>
                    <button @click="saveSketch">
                        Save
                    </button>
                    <button @click="openSketch">
                        Import
                    </button>
                    <button @click="exportDXF">
                        Export
                        <a target="_blank" id="downloader"></a>
                    </button>
                </div>
            </div>
        </div>
        <div id="footer" class="footer-container">
            <div id="foot-hint" class="item"></div>
            <div id="foot-message" class="item"></div>
            <div id="foot-tool" class="item">Choose a Tool.</div>
        </div>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from 'vue-property-decorator';
    import Sketcher from "@/web/sketches/sketcher";
    import CircleTool from "@/web/sketches/tools/circle";
    import Tool, {
        CIRCLETOOL,
        LINETOOL,
        POINTTOOL,
        TRIMTOOL,
        COPYTOOL,
        BRUSHTOOL, SPLINETOOL, RECTANGLETOOL, ARCTOOL, MEASURETOOL, CHECKTOOL
    } from "@/web/sketches/tools/tool";
    import {
        COINCIDENT, COLLINEAR, EQUALLENGTH,
        EQUALRADIUS,
        HORIZONTAL,
        PARALLEL, PERPENDICULAR, PTONCIRCLE, PTONLINE, SYMMETRIC, TANGENT,
        VERTICAL
    } from '@/web/sketches/constraints/schema';
    import SketchProject from "@/web/sketches/project";


    @Component({})
    export default class Sketch extends Vue {
        sketcher: Sketcher | null = null;
        sketchProject: SketchProject | null = null;
        detachers: Array<Function> = [];
        curToolName: string = 'Pan';
        curConstraint: string = 'None';

        config: any = {
            lineWidth: 1,
            lineColor: '#f2849e',
            shadowBlur: 2
        };
        tools: Array<{ id: number, title: string, className: string, action: string }> = [{
            id: 0,
            title: 'point',
            className: 'fa fa-times-circle-o',
            action: POINTTOOL
        }, {
            id: 1,
            title: 'line',
            className: 'fa fa-minus',
            action: LINETOOL
        }, {
            id: 2,
            title: 'rectangle',
            className: 'fa fa-square-o',
            action: RECTANGLETOOL
        }, {
            id: 3,
            title: 'circle',
            className: 'fa fa-circle-thin',
            action: CIRCLETOOL
        }, {
            id: 4,
            title: 'arc',
            className: 'fa fa-moon-o',
            action: ARCTOOL
        }, {
            id: 5,
            title: 'spline',
            className: 'fa fa-cloud',
            action: SPLINETOOL
        }, {
            id: 6,
            title: 'brushes',
            className: 'fa fa-paint-brush',
            action: BRUSHTOOL
        }, {
            id: 7,
            title: 'trim',
            className: 'fa fa-scissors',
            action: TRIMTOOL,
        }, {
            id: 8,
            title: 'copy',
            className: 'fa fa-copy',
            action: COPYTOOL,
        }, {
            id: 9,
            title: 'eraser',
            className: 'fa fa-eraser',
            action: 'Erase'
        }];

        constraints: Array<{ id: number, title: string, className: string, action: number }> = [{
            id: 0,
            title: 'coincident',
            className: 'fa fa-link',
            action: COINCIDENT
        }, {
            id: 1,
            title: 'horizontal',
            className: 'fa fa-arrows-h',
            action: HORIZONTAL
        }, {
            id: 2,
            title: 'vertical',
            className: 'fa fa-arrows-v',
            action: VERTICAL
        }, {
            id: 3,
            title: 'parallel',
            className: 'fa fa-exchange',
            action: PARALLEL
        }, {
            id: 4,
            title: 'equal radius',
            className: 'fa fa-gears',
            action: EQUALRADIUS
        }, {
            id: 5,
            title: 'tangent',
            className: 'fa fa-terminal',
            action: TANGENT
        }, {
            id: 6,
            title: 'pendicular',
            className: 'fa fa-plus',
            action: PERPENDICULAR
        }, {
            id: 7,
            title: 'equal length',
            className: 'fa fa-bars',
            action: EQUALLENGTH
        }, {
            id: 8,
            title: 'symmetric',
            className: 'fa fa-venus-double',
            action: SYMMETRIC
        }, {
            id: 9,
            title: 'point on line',
            className: 'fa fa-neuter',
            action: PTONLINE
        }, {
            id: 10,
            title: 'point on circle',
            className: 'fa fa-circle-o-notch',
            action: PTONCIRCLE
        }];

        analysis: Array<{ id: number, title: string, className: string, action: string }> = [{
            id: 0,
            title: 'measure',
            className: 'fa fa-text-height',
            action: MEASURETOOL
        }, {
            id: 1,
            title: 'check world',
            className: 'fa fa-check',
            action: CHECKTOOL
        }];

        mounted(): void {
            const canvas = document.getElementById('canvas') as HTMLCanvasElement;
            this.sketcher = new Sketcher(canvas);
            // init the project
            this.sketchProject = new SketchProject(this.sketcher);

            this.detachers.push(this.sketcher.streams.tool.$change.attach((tool: Tool) => {
                this.curToolName = tool.ToolName;
                canvas.style.cursor = tool.cursorStyle;
            }));

            const hint = document.getElementById('foot-hint') as HTMLElement;
            this.detachers.push(this.sketcher.streams.tool.$hint.attach((text: string) => {
                hint.innerHTML = text;
            }));

            const message = document.getElementById('foot-message') as HTMLElement;
            this.detachers.push(this.sketcher.streams.tool.$message.attach((text: string) => {
                message.innerHTML = text;
            }));

            const toolHint = document.getElementById('foot-tool') as HTMLElement;
            this.detachers.push(this.sketcher.streams.tool.$change.attach((tool: Tool) => {
                toolHint.innerHTML = 'Select a ' + tool.ToolName.toUpperCase() + ' Tool.';
                if (tool.ToolName === CIRCLETOOL) {
                    const circleTool = tool as CircleTool;
                    if (circleTool.isDragging) {
                        toolHint.innerHTML = 'Select a DRAG Tool.';
                    }
                }
            }));

            this.detachers.push(this.sketcher!.streams.constraints.$message.attach((infos: any) => {
                if (infos.type === 'info') {
                    toolHint.innerHTML = infos.message;
                } else if (infos.type === 'error') {
                    this.$toast.error(infos.message);
                }
            }));
            document.querySelector('body')!.classList.add('fix-body');
        }

        destroyed(): void {
            this.sketcher!.dispose();
            this.sketchProject!.dispose();
            this.detachers.forEach((item) => {
                item();
            });
            document.querySelector('body')!.classList.remove('fix-body');
        }

        get controls() {
            return [{
                id: 0,
                title: 'last step',
                action: 'undo',
                className: (this.sketcher ? this.sketcher.canUndo : 0) ? 'active fa fa-reply' : 'fa fa-reply'
            }, {
                id: 1,
                title: 'next step',
                action: 'redo',
                className: (this.sketcher ? this.sketcher.canRedo : 0) ? 'active fa fa-share' : 'fa fa-share'
            }, {
                id: 2,
                title: 'clear steps',
                action: 'clear',
                className: (this.sketcher ? this.sketcher.activeLayer.objects.length > 0 : 0) ? 'active fa fa-trash' : 'fa fa-trash'
            }]
        }

        setTool(action: string) {
            this.sketcher!.toolManager.selectTool(action);
        }

        addConstraint(action: number) {
            this.sketcher!.addConstraint(action);
        }

        controlCanvas(action: string) {
            switch (action) {
                case 'undo':
                    this.sketcher!.undo();
                    break;
                case 'redo':
                    this.sketcher!.redo();
                    break;
                case 'clear':
                    this.sketcher!.clear();
                    break;
                default:
                    break;
            }
        }

        get sketchName() {
            if (this.sketchProject === null) {
                return 'untitled';
            }
            return this.sketchProject.name;
        }

        newSketch() {
            this.sketchProject!.newSketch();
        }

        openSketch() {
            alert("not support yet");
        }

        saveSketch() {
            this.sketchProject!.saveSketch();
        }

        exportDXF() {
            this.sketcher!.export();
        }
    }
</script>

<style scoped>
    @media screen and (max-width: 760px) {
        #img-box,
        #canvas-io h5,
        #canvas-brush {
            display: none;
        }

        #canvas-io button {
            width: auto;
            position: absolute;
            flex: 1;
        }

        .wrap #control {
            width: 100%;
            height: auto;
            display: flex;
            flex-direction: row;
            text-align: center;
        }
    }

    .fix-body {
        position: fixed !important;
        left: 0;
        top: 0;
        bottom: 0;
        right: 0;
        overflow: hidden;
    }

    .sketch-container {
        width: 900px;
        display: flex;
        flex-direction: column;
        border: 1px #585858 solid;
    }

    .footer-container {
        width: 100%;
        background-color: #bbb;
        z-index: 9999;

        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
    }

    .footer-container .item {
        font-size: 1em;
        text-align: left;
    }

    .inner {
        display: flex;
        flex-direction: row;
        text-align: left;
    }

    .draw h5 {
        margin-top: 0px;
        margin-bottom: 10px;
    }

    #img-box {
        flex: 1;
        padding-left: 10px;
    }

    #img-box .img-item {
        position: relative;
        display: inline-block;
    }

    #img-box .img-item .fa {
        position: absolute;
        cursor: pointer;
        right: 1px;
        top: -1px;
        font-size: 12px;
        font-weight: lighter;
        display: none;
        color: #ccc;
    }

    #img-box .img-item:hover .fa {
        display: block;
    }

    #img-box .img-item .fa:hover {
        color: #f2849e;
    }

    #img-box img {
        border: 1px #ccc solid;
        width: 90px;
        height: 60px;
        margin: 5px;
    }

    .fl {
        float: left;
        display: block;
    }

    #canvas {
        border-right: 1px #585858 solid;
        cursor: grab;
    }

    #control {
        width: 150px;
    }

    #control div {
        padding: 5px;
    }

    #canvas-tool span {
        display: inline-block;
        font-size: 14px;
        width: 20px;
        height: 15px;
        margin-left: 10px;
        cursor: pointer;
    }

    #canvas-constraint span {
        display: inline-block;
        font-size: 14px;
        width: 20px;
        height: 15px;
        margin-left: 10px;
        cursor: pointer;
    }

    #canvas-analysis span {
        display: inline-block;
        font-size: 14px;
        width: 20px;
        height: 15px;
        margin-left: 10px;
        cursor: pointer;
    }

    #canvas-control span {
        display: inline-block;
        font-size: 14px;
        width: 20px;
        height: 15px;
        margin-left: 10px;
        cursor: pointer;
    }

    #canvas-control .active,
    #canvas-constraint .active,
    #canvas-analysis .active,
    #canvas-tool .active {
        color: #f2849e;
    }

    button {
        width: 50px;
        height: 20px;
        font-size: 12px;
        margin-right: 5px;
    }
</style>
