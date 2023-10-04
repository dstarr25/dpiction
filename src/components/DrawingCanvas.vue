<template>
    <div class="flex flex-col gap-4 justify-center items-center">
        <canvas class="h-96 border-y-4 border-neutral-500" style="cursor: url(./src/assets/pb32.png), auto;image-rendering: pixelated; aspect-ratio: 4/3;" ref="canvas" @mousedown="startDrawing" @mousemove="draw" @mouseup="stopDrawing" @mouseleave="stopDrawing" width="200" height="150"></canvas>
        <!-- <div class="fixed top-10 left-10 bg-white rounded p-10 text-black">{{ debugText }}</div> -->
        <div v-if="isDrawer" class="w-full">
            <div class="flex flex-row items-center gap-1 w-full justify-center">
                <div
                    v-for="(color, index) in colorOptions"
                    :key="index"
                    @click.prevent="selectColor(color)"
                    style="transition: all 0.3s ease-in-out" 
                    :style="{ backgroundColor: color }"
                    :class="{'scale-150': selectedColor === color}"
                    class="w-10 h-10 rounded-full cursor-pointer"
                />
                <div class="w-10 h-10 cursor-pointer flex justify-center items-center text-3xl" style="transition: all 0.3s ease-in-out" :style="{ color: selectedColor }" v-on:click="fillCanvas()"><span class="material-symbols-outlined" style="font-size: inherit">format_color_fill</span></div>
            </div>
            <div class="content flex w-full justify-start">
                <div class="equalizer">
                    <input type="range" v-model="sliderVal" max="100" @input="changeSlider">
                    <div class="number" />
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { SocketMessage, ToClientMessages, ToServerMessages } from '../types'
import type { Prompt, JoinData } from '../types'
const rectsizeToScale: {[key: number]: number} = {
    1: 0.4,
    3: 0.5,
    5: 0.6,
    7: 0.57,
    9: .6
};

export default {
    props: {
        isDrawer: Boolean,
        socket: WebSocket,
        prompt: Object,
        gameId: String,
        name: String

    },
    data() {
        return {
            colorOptions: ['black', 'white', 'red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'],
            selectedColor: 'black',
            isDrawing: false,
            context: null as CanvasRenderingContext2D | null,
            lastX: 0,
            lastY: 0,
            sliderVal: "0",
            lineWidth: 1,
            // isDrawer: true,
            debugText: ""
        };
    },
    mounted() {
        // Use type assertion to specify the type of this.$refs.canvas
        this.context = (this.$refs.canvas as HTMLCanvasElement).getContext('2d', { willReadFrequently: true });
        if (!this.context) return

        // setup canvas to be white and default color black, linewidth 1 etc.
        this.context.fillStyle = 'white';
        this.context?.fillRect(0, 0, this.context.canvas.width, this.context.canvas.width);
        this.context.fillStyle = this.selectedColor;
        this.context.strokeStyle = this.selectedColor; 
        this.context.lineWidth = this.lineWidth; 

        // this.updateCursor();

    },
    methods: {
        startDrawing(e: MouseEvent) {
            if (!this.isDrawer || !this.context) return
            this.isDrawing = true;
            // Set the starting point for drawing
            this.lastX = (e.clientX - this.context.canvas.getBoundingClientRect().left) * this.context.canvas.width / this.context.canvas.offsetWidth;
            this.lastY = (e.clientY - this.context.canvas.getBoundingClientRect().top) * this.context.canvas.height / this.context.canvas.offsetHeight;
            this.context.beginPath()
            this.context.moveTo(this.lastX, this.lastY)
        },
        draw(e: MouseEvent) {
            if (!this.isDrawer || !this.isDrawing || !this.context) return
            const x = (e.clientX - this.context.canvas.getBoundingClientRect().left) * this.context.canvas.width / this.context.canvas.offsetWidth;
            const y = (e.clientY - this.context.canvas.getBoundingClientRect().top) * this.context.canvas.height / this.context.canvas.offsetHeight;
            // this.debugText = `clientX: ${e.clientX}, clientY: ${e.clientY}` +
            // `boundingleft: ${this.context.canvas.getBoundingClientRect().left}, boundingTop: ${this.context.canvas.getBoundingClientRect().top}`
            // this.debugText = `w: ${this.context.canvas.width}, h: ${this.context.canvas.height}`
            // Draw a line from the last point to the current point
            // this.context.beginPath();
            this.context.lineTo(x, y);
            // this.context.lineTo(x, y);
            this.context.stroke();

            // Update the last point
            this.lastX = x;
            this.lastY = y;
        },
        stopDrawing() {
            if (!this.isDrawer || !this.context || !this.isDrawing) return
            this.isDrawing = false;
            this.context.closePath()
            this.sendCanvasToSocket()
        },
        selectColor(color: string) {
            if (!this.isDrawer || color === this.selectedColor || !this.context) return;
            this.selectedColor = color;
            this.context.strokeStyle = color;
            this.context.fillStyle = color;
            // this.updateCursor();
            document.body.style.setProperty("--color", color);
        },
        // updateCursor() {
        //     if (!this.isDrawer || !this.context) return;
        //     const canvas = this.context.canvas;
        //     const rectSize = 4 * this.context.lineWidth;
        //     const shiftScale = rectsizeToScale[rectSize / 4]; // (20, 0.72) (10, 0.5) (5, 0.15) (8, 0.4) (12, 0.6) (15, 0.69) (17, 0.71)
        //     const sizeScale = 0.8;
        //     canvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${rectSize * sizeScale}" height="${rectSize * sizeScale}"><rect width="${rectSize * sizeScale}" height="${rectSize * sizeScale}" fill="${this.selectedColor}"/></svg>') ${rectSize * shiftScale} ${rectSize * shiftScale}, crosshair`;
        // },
        fillCanvas() {
            if (!this.isDrawer || !this.context) return;
            this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.width);
            this.sendCanvasToSocket();
        },
        changeSlider() {
            if (!this.isDrawer || !this.context) return;
            console.log('sliderVal:', this.sliderVal);
            document.body.style.setProperty('--eqz', this.sliderVal);
            // change size to the closest value to 
            const progress = parseInt(this.sliderVal) / 100.0 * 8 + 1;
            let closest = 69420;
            for (const sizeOption of Object.keys(rectsizeToScale).map(Number)) {
                const dif = Math.abs(sizeOption - progress);
                if (dif < Math.abs(progress - closest)) closest = sizeOption;
            }
            // set the size
            if (closest === this.lineWidth) return;
            this.lineWidth = closest;
            this.context.lineWidth = closest;
            // this.updateCursor();
            document.body.style.setProperty('--brushSize', (closest * 2 * 1.5).toString());
            console.log('closest', closest);
        },
        sendCanvasToSocket() {
            if (!this.isDrawer || !this.context || !this.socket) return;
            const imageData = this.context.getImageData(0, 0, this.context.canvas.width, this.context.canvas.height);
            const pixelData = Array.from(imageData.data); // Convert Uint8ClampedArray to a regular array
            const drawMessage = new SocketMessage(ToServerMessages.DRAW, {
                width: imageData.width,
                height: imageData.height,
                pixels: pixelData,
                gameId: this.gameId,
                name: this.name
            })
            this.socket.send(JSON.stringify(drawMessage))
            // console.log('sent to socket:', JSON.stringify(drawMessage))
        }
        
    },
}
</script>

<style scoped>

.content {
	position: relative;
	width: calc(var(--sz) * 50);
	height: calc(var(--sz) * 20);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-left: calc(var(--sz) * 20);
}

.content:before, .content:after {
	content: "";
	position: absolute;
	width: calc(var(--sz) * 23.5);
	height: calc(var(--sz) * 17);
	border: var(--sz) solid #ffffff;
	border-radius: 80% 40% 40% 80% / 60% 60% 60% 60%;
	top: calc(var(--sz) * 1.1);
	left: calc(var(--sz) * 2.5);
	transform: rotate(0deg);
	transform-origin: 0 0;
	z-index: -5;
	clip-path: polygon(0 30%, 0 0, 100% 0, 100% 100%, 0 100%, 0 70%, 10% 65%, 15% 45%);
}

.content:after {
	border-color: #0006;
	top: calc(var(--sz) * 1.5);
	left: calc(var(--sz) * 2.5);
	filter: blur(2px);
	z-index: -6;
}


.equalizer {
	height: 100%;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.equalizer:before, .equalizer:after {
	content: "";
	--ss: #fff;
	background: radial-gradient(#fff0 calc(var(--sz) * 2.6), var(--ss) calc(calc(var(--sz) * 2.6) + 1px));
	width: calc(var(--sz) * 7);
	position: absolute;
	height: calc(var(--sz) * 7);
	border-radius: 100%;
	left: calc(var(--sz) * -1);
	top: calc(var(--sz) * 6.3);
	z-index: -5;
}

.equalizer:after {
	--ss: #0006;
	filter: blur(2px);
	left: calc(var(--sz) * -0.5);
	top: calc(var(--sz) * 6.5);
	z-index: -6;
}


/* Range Styles */

input[type='range'] {
	width: 100%;
	height: calc(var(--sz) * 3);
	position: absolute;
	background: none;
	--color-changing-filter: hue-rotate(calc(var(--eqz) * -2.25deg));
	/* --bg-thumb: radial-gradient(#ff3a3a calc(var(
		--sz) * 5.35), #fff0 0 100%); */
	--bs-thumb: 0 0 0px calc(var(
		--sz) * 0.5) #3a3d44 inset;
	transform: rotate(calc(var(--eqz) * 1.8125deg));
	transform-origin: 50% 50%;
}

input[type='range']:focus,
input[type=range]:focus::-webkit-slider-runnable-track {
	outline: none;
}

input[type='range'],
input[type='range']::-webkit-slider-runnable-track,
input[type='range']::-webkit-slider-thumb {
	-webkit-appearance: none;
}

/*** Range Thumb***/

input[type=range]::-webkit-slider-thumb {
	width: calc(var(--sz) * 5);
	height: calc(var(--sz) * 5);
	border-radius: calc(var(--sz) * 0.5);
	cursor: pointer;
	margin-top: calc(var(--sz) * -0.5);
    background-color: var(--color);
	transform: scale(calc(var(--brushSize) * 0.075));
    transition: all 0.3s ease-in-out;
}

input[type=range]::-moz-range-thumb {
	width: calc(var(--sz) * 5);
	height: calc(var(--sz) * 5);
	border-radius: calc(var(--sz) * 0.5);
	cursor: pointer;
	margin-top: calc(var(--sz) * -0.5);
    background-color: var(--color);
	transform: scale(calc(var(--brushSize) * 0.075));
    transition: all 0.3s ease-in-out;
}

/*** Number ***/

.number {
	position: absolute;
	bottom: calc(var(--sz) * 14);
	left: calc(var(--sz) * 7);
	color: #fff;
	font-size: calc(var(--sz) * 4);
	transform: rotate(-3deg);
	text-shadow: calc(var(--sz) * 0.25) calc(var(--sz) * 0.25) calc(var(--sz) * 0.25) #0008;
}

.number:before {
	counter-reset: variable var(--eqz);
	content: 'thickness';
	position: absolute;
	display: flex;
	align-items: center;
	justify-content: center;
	width: calc(var(--sz) * 15);
	height: calc(var(--sz) * 8);
	overflow: hidden;
}

</style>