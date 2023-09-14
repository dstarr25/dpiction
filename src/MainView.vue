<script lang="ts">
import { SocketMessage, ToServerMessages } from './types';

// import DrawingCanvas from './components/DrawingCanvas.vue'
export default {
    data() {
        return {
            socket: null as WebSocket | null,
            players: [],
            admin: "",
            name: ""
        }
    },
    mounted() {
        console.log(this.$route.query)
    },
    methods: {
        createGame() {
            this.socket = new WebSocket("ws://localhost:3000")
            this.socket.addEventListener("open", () => {
                if (!this.socket) return
                console.log("WebSocket connection opened.");
                // Now that the connection is open, you can send a message.
                const joinMessage = new SocketMessage(ToServerMessages.JOIN, {
                    name: this.name,
                    gameId: 'banana'
                })
                console.log(joinMessage)
                // this.socket.send(JSON.stringify(joinMessage))
            })

        }
    }
}
</script>

<template>
    <!-- <DrawingCanvas /> -->
    <div>
        <div v-if="$route.query === undefined">
            <input type="text" v-model="name">
            <button type="button" @click="createGame">create game</button>

        </div>
    </div>
</template>

