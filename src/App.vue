<script lang="ts">
import { SocketMessage, ToClientMessages, ToServerMessages, Player, CodeMessages } from './types';
import type { JoinSuccessData, JoinDataToClient, LeaveDataToClient } from './types'
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
            gameId: "",
            isDrawer: false
        }
    },
    mounted() {
        // something
    },
    computed: {
        urlGameId() {
            const usp = new URLSearchParams(window.location.search)
            const gameId = usp.get('gameId')
            return gameId
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
                } else if (action === ToClientMessages.LEAVE) {
                    const data = json.data as LeaveDataToClient
                    delete this.players[data.playerName]
                    this.admin = data.admin
                    this.isDrawer = data.drawer === this.name
                }
            })
            this.socket.addEventListener('close', (event) => {
                console.log('close event code: ', event.code)
                sendErrorMessage(`${CodeMessages[event.code]}`)
                this.resetData()
            })
        },
        // createGame() {
        //     this.startWebSocket('banana')

        // },
        joinGame() {
            let id = this.urlGameId;
            if (id === null) id = 'banana'
            this.startWebSocket(id)
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
            <div v-if="!gameId" class="flex p-10 w-full h-full flex justify-center items-center">
                <form @submit.prevent="joinGame">
                    <input class="rounded-l-md border-r-2 border-black outline-none p-2" type="text" placeholder="name" v-model="name">
                    <button class="bg-white rounded-r-md border-l-2 border-black outline-none p-2 hover:bg-gray-400 transition-all" type="submit">{{ urlGameId ? 'join game' : 'create game' }}</button>
                </form>
            </div>
            <div v-else class="bg-red-400 w-full h-full flex justify-center items-center flex-col">
                <p v-for="playerName of Object.keys(players)" :key="playerName">{{ playerName }}</p>
            </div>
        </transition>
    </div>
</template>

<style scoped>

</style>