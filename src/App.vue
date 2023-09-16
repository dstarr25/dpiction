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
        // something
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
            this.socket.addEventListener('close', (event) => {
                console.log('close event code: ', event.code)
                sendErrorMessage(`Error: ${CodeMessages[event.code]}`)
                this.resetData()
            })
        },
        createGame() {
            this.startWebSocket('banana')

        },
        joinGame() {
            const gameId = this.urlSearchParams.get('gameId') as string
            this.startWebSocket(gameId)
        },
        resetData() {
            this.players = { }
            this.admin = ""
            this.name = ""
            this.gameId = ""
        }
    }
}
</script>

<template>
    <!-- <DrawingCanvas /> -->
    <div class="appContainer">
        <transition mode="out-in"
            enter-active-class="duration-300 ease-in-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="duration-300 ease-in-out"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div v-if="!gameId" class="flex gap-4 bg-black p-10 w-full h-full flex justify-center items-center">
                <input class="rounded p-2" type="text" placeholder="name" v-model="name">

                <button v-if="!urlSearchParams.has('gameId')" class="bg-gray-400 rounded p-2 hover:scale-110 transition-all" type="button" @click="createGame">create game</button>
                <button v-else type="button" class="bg-gray-400 rounded p-2" @click="joinGame">join game</button>

            </div>
            <div v-else class="bg-red-400 w-full h-full flex justify-center items-center">
                <p v-for="playerName of Object.keys(players)" :key="playerName">{{ playerName }}</p>
            </div>
        </transition>
    </div>
</template>

<style scoped>

</style>