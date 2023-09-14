<script lang="ts">
import { SocketMessage, ToClientMessages, ToServerMessages } from './types';
import type { JoinSuccessData } from './types'

// import DrawingCanvas from './components/DrawingCanvas.vue'
export default {
    data() {
        return {
            socket: null as WebSocket | null,
            players: [] as string[],
            admin: "",
            name: "",
            gameId: ""
        }
    },
    mounted() {
        // let queryString = window.location.search;
        // let urlParams = new URLSearchParams(queryString);

        // if (urlParams.has('gameId')) {
        //     locationFilter = urlParams.get('location');
        // }
    },
    computed: {
        urlSearchParams() {
            return new URLSearchParams(window.location.search)
        }
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
                this.socket.send(JSON.stringify(joinMessage))
            })
            this.socket.addEventListener("message", event => {
                console.log(`Received message: ${event.data}`)
                const json = JSON.parse(event.data) as SocketMessage
                const action = json.action
                if (action === ToClientMessages.JOIN_SUCCESS) {
                    const data = json.data as JoinSuccessData
                    this.players = data.players
                    this.admin = data.admin
                    this.gameId = data.gameId
                }
            })


        },
        joinGame() {
            const gameId = this.urlSearchParams.get('gameId')
            this.socket = new WebSocket("ws://localhost:3000")
            this.socket.addEventListener("open", () => {
                if (!this.socket) return
                console.log("WebSocket connection opened.");
                // Now that the connection is open, you can send a message.
                const joinMessage = new SocketMessage(ToServerMessages.JOIN, {
                    name: this.name,
                    gameId
                })
                console.log(joinMessage)
                this.socket.send(JSON.stringify(joinMessage))
            })
            this.socket.addEventListener("message", event => {
                console.log(`Received message: ${event.data}`)
                const json = JSON.parse(event.data) as SocketMessage
                const action = json.action
                if (action === ToClientMessages.JOIN_SUCCESS) {
                    const data = json.data as JoinSuccessData
                    this.players = data.players
                    this.admin = data.admin
                    this.gameId = data.gameId
                }
            })

        }
    }
}
</script>

<template>
    <!-- <DrawingCanvas /> -->
    <div>
        <div v-if="!gameId">
            <input type="text" placeholder="name" v-model="name">

            <button v-if="!urlSearchParams.has('gameId')" type="button" @click="createGame">create game</button>
            <button v-else type="button" @click="joinGame">join game</button>

        </div>
        <div v-else>
            <p v-for="player of players" :key="player">{{ player }}</p>
        </div>
    </div>
</template>

