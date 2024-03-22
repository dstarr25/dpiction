<template>
    <div class="flex flex-col gap-4 justify-center items-center">
        <canvas class="h-96 border-y-4 border-neutral-500" style="image-rendering: pixelated; aspect-ratio: 4/3;" :style="cursorStyle" ref="canvas" @mousedown="startDrawing" @mousemove="draw" @mouseup="stopDrawing" @mouseleave="stopDrawing" width="200" height="150"></canvas>
        <!-- <div class="fixed top-10 left-10 bg-white rounded p-10 text-black">{{ debugText }}</div> -->
        <div v-if="isDrawer" class="w-full p-8 flex flex-col gap-6">
            <div class="flex flex-row items-center gap-1 w-full justify-between">
                <div
                    v-for="(color, index) in colorOptions"
                    :key="index"
                    @click.prevent="selectColor(color)"
                    style="transition: all 0.3s ease-in-out" 
                    :style="{ backgroundColor: color }"
                    :class="{'scale-150': selectedColor === color}"
                    class="w-10 h-10 rounded-full cursor-pointer drop-shadow"
                />
                <div class="w-10 h-10 cursor-pointer flex justify-center items-center text-3xl" style="transition: all 0.3s ease-in-out" :style="{ color: selectedColor }" v-on:click="fillCanvas()">
                    <span class="material-symbols-outlined drop-shadow" style="font-size: inherit">format_color_fill</span>
                </div>
            </div>
            <div class="flex w-full justify-start flex-row-reverse items-center text-black gap-4">
                <div class="w-10 h-10 flex justify-center items-center">
                    <div class="rounded-full transition-all" :style="{ backgroundColor: selectedColor, width: `${(parseInt(lineWidth) + 1) * 10}%`, height: `${(parseInt(lineWidth) + 1) * 10}%` }" />
                </div>
                <input type="range" v-model="lineWidth" min="1" max="9" @input="changeSlider">
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { SocketMessage, ToClientMessages, ToServerMessages } from '../types'
import type { Prompt, JoinData } from '../types'

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
            lineWidth: 1,
            debugText: ""
        };
    },
    computed: {
        cursorStyle() {
            return this.isDrawer ? { cursor: `url(pb32.png), auto` } : {}
        }
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
        },
        clearCanvas() {
            if (!this.context) return;
            const oldColor = this.context.fillStyle
            this.context.fillStyle = '#ffffff'
            this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.width);
            this.context.fillStyle = oldColor
        },
        fillCanvas() {
            if (!this.isDrawer || !this.context) return;
            this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.width);
            this.sendCanvasToSocket();
        },
        changeSlider() {
            if (!this.isDrawer || !this.context) return;
            this.context.lineWidth = parseInt(this.lineWidth);
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

input[type="range"] {
    -webkit-appearance: none;
    background: transparent;

}

input[type="range"]::-webkit-slider-runnable-track, input[type="range"]::-moz-range-track {
  box-shadow: rgba(50, 50, 93, 0.25) 0px 5px 15px -3px inset, rgba(0, 0, 0, 0.3) 0px 4px 8px -4px inset;
  height: 0.5rem;
  border-radius: 10000px;
}

input[type="range"]::-webkit-slider-thumb, input[type="range"]::-moz-range-thumb {
  box-shadow: rgba(50, 50, 93, 0.25) 0px 5px 15px -3px, rgba(0, 0, 0, 0.3) 0px 4px 8px -4px;
  border: 0;
  height: 1.5rem;
  width: 1.5rem;
  border-radius: 10000px;
  background: #fff;
  cursor: pointer;
  -webkit-appearance: none;
  margin-top: -6px;
}

</style>