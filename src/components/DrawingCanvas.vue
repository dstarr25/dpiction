<template>
    <div class="canvas-container">
        <canvas ref="canvas" @mousedown="startDrawing" @mousemove="draw" @mouseup="stopDrawing" width="800" height="600"></canvas>
            <div class="palette">
                <div
                  v-for="(color, index) in colorOptions"
                  :key="index"
                  @click="selectColor(color)"
                  :style="{ backgroundColor: color, transform: selectedColor == color ? 'scale(1.2)' : 'scale(1)' }"
                  class="color-box"
                ></div>
            </div>


    </div>
</template>

<script lang="ts">
export default {
    data() {
        return {
            colorOptions: ['white', 'red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'],
            selectedColor: 'white',
            isDrawing: false,
            context: null as CanvasRenderingContext2D | null,
            lastX: 0,
            lastY: 0,
        };
    },
    mounted() {
        // Use type assertion to specify the type of this.$refs.canvas
        this.context = (this.$refs.canvas as HTMLCanvasElement).getContext('2d');
        if (this.context) {
            this.context.strokeStyle = this.selectedColor; // Set your desired drawing color
            this.context.lineWidth = 4; // Set your desired line width
        }
    },
    methods: {
        startDrawing(event: MouseEvent) {
            this.isDrawing = true;
            if (this.context) {
                this.context.beginPath();
                this.context.moveTo(
                    event.clientX - (this.$refs.canvas as HTMLCanvasElement).getBoundingClientRect().left,
                    event.clientY - (this.$refs.canvas as HTMLCanvasElement).getBoundingClientRect().top
                );
            }
        },
        draw(event: MouseEvent) {
            if (!this.isDrawing) return;
            if (this.context) {
                this.context.lineTo(
                    event.clientX - (this.$refs.canvas as HTMLCanvasElement).getBoundingClientRect().left,
                    event.clientY - (this.$refs.canvas as HTMLCanvasElement).getBoundingClientRect().top
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
            this.selectedColor = color;
            if (!this.context) return;
            this.context.strokeStyle = color;
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


  width: 50px;
  height: 50px;
  /* margin: 5px; */
  cursor: pointer;
  border-radius: 50px;
  transition: all 0.3s ease-in-out;
}

.palette {
    display: flex;
    flex-direction: row;
    gap: 10px;
}
</style>