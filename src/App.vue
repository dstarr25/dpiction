<script lang="ts">
import { SocketMessage, ToClientMessages, ToServerMessages, Player, CodeMessages } from './types';
import type { JoinSuccessData, JoinDataToClient } from './types'
import Swal from 'sweetalert2'

// import DrawingCanvas from './components/DrawingCanvas.vue'

const sendErrorMessage = (message: string) => {
    Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        text: message
    })
}

export default {
    data() {
        return {
            socket: null as WebSocket | null,
            players: {} as {[key: string]: Player},
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
        startWebSocket(gameId: string) {
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
                    data.players.forEach((name) => {
                        this.players[name] = new Player(name)
                    })
                    this.admin = data.admin
                    this.gameId = data.gameId
                } else if (action === ToClientMessages.JOIN) {
                    const data = json.data as JoinDataToClient
                    this.players[data.name] = new Player(data.name)
                }
            })
            this.socket.addEventListener('error', (event) => {
                // An error occurred during the connection attempt
                sendErrorMessage('Connection error. Try again later.')
            })
            this.socket.addEventListener('close', (event) => {
                sendErrorMessage(`Error: ${CodeMessages[event.code]}`)
            })
        },
        createGame() {
            this.startWebSocket('banana')

        },
        joinGame() {
            const gameId = this.urlSearchParams.get('gameId') as string
            this.startWebSocket(gameId)
        }
    }
}
</script>

<template>
    <!-- <DrawingCanvas /> -->
    <div class="container">
        <div v-if="!gameId">
            <input type="text" placeholder="name" v-model="name">

            <button v-if="!urlSearchParams.has('gameId')" type="button" @click="createGame">create game</button>
            <button v-else type="button" @click="joinGame">join game</button>

        </div>
        <div v-else>
            <p v-for="playerName of Object.keys(players)" :key="playerName">{{ playerName }}</p>
        </div>
    </div>
</template>

