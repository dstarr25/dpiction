<template>
    <div class="canvas-container">
        <canvas ref="canvas" @mousedown="startDrawing" @mousemove="draw" @mouseup="stopDrawing" width="800" height="600"></canvas>
        <div class="palette">
            <div
                v-for="(color, index) in colorOptions"
                :key="index"
                @click.prevent="selectColor(color)"
                :style="{ backgroundColor: color, transform: selectedColor == color ? 'scale(1.7)' : 'scale(1)' }"
                class="color-box"
            />
            <div class="color-box icon" style="margin-left: 15px;" v-on:click="fillCanvas()"><span class="material-symbols-outlined" style="font-size: inherit">format_color_fill</span></div>
        </div>
        <div class="content">
            <div class="equalizer">
                <input type="range" v-model="sliderVal" max="100" 
                    @input="changeSlider"
                
                >
                <div class="number"></div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
const rectsizeToScale: {[key: number]: number} = {
    20: 0.72,
    10: 0.5,
    5: 0.15,
    8: 0.4,
    12: 0.6,
    15: 0.69,
    17: 0.71
};
export default {
    data() {
        return {
            colorOptions: ['black', 'white', 'red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'],
            selectedColor: 'black',
            isDrawing: false,
            context: null as CanvasRenderingContext2D | null,
            lastX: 0,
            lastY: 0,
            sliderVal: "0",
            lineWidth: 5
        };
    },
    mounted() {
        // Use type assertion to specify the type of this.$refs.canvas
        this.context = (this.$refs.canvas as HTMLCanvasElement).getContext('2d');
        if (this.context) {

            this.context.fillStyle = 'white';
            this.context?.fillRect(0, 0, (this.$refs.canvas as HTMLCanvasElement).width, (this.$refs.canvas as HTMLCanvasElement).width);
            this.context.fillStyle = this.selectedColor;
            this.context.strokeStyle = this.selectedColor; 
            this.context.lineWidth = this.lineWidth; 
            this.updateCursor();
        }
    },
    methods: {
        startDrawing(event: MouseEvent) {
            this.isDrawing = true;
            if (this.context) {
                this.context.beginPath();
                this.context.moveTo(
                    event.clientX - this.context.lineWidth / 2 - (this.$refs.canvas as HTMLCanvasElement).getBoundingClientRect().left,
                    event.clientY - this.context.lineWidth / 2 - (this.$refs.canvas as HTMLCanvasElement).getBoundingClientRect().top
                );
            }
        },
        draw(event: MouseEvent) {
            if (!this.isDrawing) return;
            if (this.context) {
                this.context.lineTo(
                    event.clientX - this.context.lineWidth / 2 - (this.$refs.canvas as HTMLCanvasElement).getBoundingClientRect().left,
                    event.clientY - this.context.lineWidth / 2 - (this.$refs.canvas as HTMLCanvasElement).getBoundingClientRect().top
                );
                this.context.stroke();
            }
        },
        stopDrawing() {
            this.isDrawing = false;
            if (this.context) {
                this.context.closePath();
            }
        },
        selectColor(color: string) {
            if (color === this.selectedColor) return;
            if (!this.context) return;
            this.selectedColor = color;
            this.context.strokeStyle = color;
            this.context.fillStyle = color;
            this.updateCursor();
            document.body.style.setProperty("--color", color);
        },
        updateCursor() {
            // return;
            if (!this.context) return;
            const canvas = this.$refs.canvas as HTMLCanvasElement;
            const rectSize = this.context.lineWidth;
            const scale = rectsizeToScale[rectSize]; // (20, 0.72) (10, 0.5) (5, 0.15) (8, 0.4) (12, 0.6) (15, 0.69) (17, 0.71)
            canvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${rectSize}" height="${rectSize}"><rect width="${rectSize}" height="${rectSize}" fill="${this.selectedColor}"/></svg>') ${rectSize * scale} ${rectSize * scale}, crosshair`;
        },
        fillCanvas() {
            this.context?.fillRect(0, 0, (this.$refs.canvas as HTMLCanvasElement).width, (this.$refs.canvas as HTMLCanvasElement).width);
        },
        changeSlider() {
            if (!this.context) return;
            console.log('sliderVal:', this.sliderVal);
            document.body.style.setProperty('--eqz', this.sliderVal);
            // change size to the closest value to 
            const progress = parseInt(this.sliderVal) / 100.0 * 15 + 5;
            let closest = 69420;
            for (const sizeOption of Object.keys(rectsizeToScale).map(Number)) {
                const dif = Math.abs(sizeOption - progress);
                if (dif < Math.abs(progress - closest)) closest = sizeOption;
            }
            // set the size
            if (closest === this.lineWidth) return;
            this.lineWidth = closest;
            this.context.lineWidth = closest;
            this.updateCursor();
            document.body.style.setProperty('--brushSize', closest.toString());
        }
        
    },
};
</script>

<style scoped>
.canvas-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 20px;
    align-items: center;
    height: 100vh; /* Make the container fill the entire viewport height */
}

canvas {
    border: 5px solid rgb(21, 21, 21);
    border-radius: 5px;
    max-width: 100%; /* Ensure the canvas doesn't exceed the screen width */
    max-height: 100%; /* Ensure the canvas doesn't exceed the screen height */
}
.color-box {

    user-select: none;
    width: 40px;
    height: 40px;
    /* margin: 5px; */
    cursor: pointer;
    border-radius: 40px;
    transition: all 0.3s ease-in-out;
}

.icon {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 40px;
    color: white;
}

.palette {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 4px;
}

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