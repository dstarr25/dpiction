<script lang="ts">
import { SocketMessage, ToClientMessages, ToServerMessages, Player, CodeMessages, GameStates } from './types';
import type { JoinSuccessData, JoinDataToClient, LeaveDataToClient, ErrorDataToClient, PromptSuccessDataToClient, NewRoundDataToClient, Prompt, TimeRemainingDataToClient, DrawDataToClient } from './types'
import Swal from 'sweetalert2'

import loadingImage from './assets/loading.png'

import DrawingCanvas from '@/components/DrawingCanvas.vue'
import TransitionModal from '@/components/TransitionModal.vue'

const showErrorMessage = (message: string) => {
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

const showSuccessMessage = (message: string) => {
    Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1000,
        icon: 'success',
        text: message
    })
}

export default {
    data() {
        return {
            GameStates,
            socket: undefined as WebSocket | undefined,
            players: {} as {[key: string]: Player},
            admin: '',
            name: '',
            gameId: '',
            gameState: '',
            loading: false,
            promptEdit: "",
            roundNum: -1,
            drawer: "",
            choices: [] as Prompt[],
            prompt: {} as Prompt,
            timeRemaining: -1,
            showChoiceModal: false,
            drawerChosen: false
        }
    },
    components: {
        DrawingCanvas,
        modal: TransitionModal
    },
    mounted() {
        // something
    },
    computed: {
        urlGameId() {
            const usp = new URLSearchParams(window.location.search)
            const gameId = usp.get('gameId')
            return gameId
        },
        isDrawer() {
            return this.drawer === this.name
        }
    },
    methods: {
        startWebSocket(gameId: string) {
            this.socket = new WebSocket('ws://localhost:3000')
            this.socket.addEventListener('open', () => {
                if (!this.socket) return
                console.log('WebSocket connection opened.');
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
                    this.gameState = this.GameStates.OPEN
                    this.loading = false
                } else if (action === ToClientMessages.JOIN) {
                    const data = json.data as JoinDataToClient
                    this.players[data.name] = new Player(data.name)
                } else if (action === ToClientMessages.LEAVE) {
                    const data = json.data as LeaveDataToClient
                    delete this.players[data.playerName]
                    this.admin = data.admin
                    this.drawer = data.drawer
                } else if (action === ToClientMessages.ERROR) {
                    const data = json.data as ErrorDataToClient
                    showErrorMessage(data.error)
                } else if (action === ToClientMessages.START) {
                    // data should be empty obj, don't do anything with it
                    this.gameState = GameStates.PROMPTS
                } else if (action === ToClientMessages.PROMPT_SUCCESS) {
                    const data = json.data as PromptSuccessDataToClient
                    showSuccessMessage(`Submitted: "${data.prompt}"`)

                } else if (action === ToClientMessages.NEW_ROUND) {
                    const data = json.data as NewRoundDataToClient
                    this.gameState = this.GameStates.DRAWING
                    this.roundNum = data.roundNum
                    this.drawer = data.drawer
                } else if (action === ToClientMessages.CHOICES) {
                    const data = json.data as Prompt[]
                    this.choices = data

                } else if (action === ToClientMessages.TIME_REMAINING) {
                    const data = json.data as TimeRemainingDataToClient
                    this.timeRemaining = data.timeRemaining
                } else if (action === ToClientMessages.DRAWER_CHOSEN) {
                    this.drawerChosen = true
                } else if (action === ToClientMessages.DRAW) {
                    const ctx = (this.$refs.canvas?.$refs.canvas as HTMLCanvasElement).getContext('2d', { willReadFrequently: true })
                    if (!ctx) return

                    const data = json.data as DrawDataToClient
                    const w = data.width
                    const h = data.height
                    if (ctx.canvas.width !== w || ctx.canvas.height !== h) return

                    const pixelData = data.pixels
                    const newImageData = ctx.createImageData(w, h)

                    // Copy the pixelData into the new ImageData object
                    for (let i = 0; i < pixelData.length; i++) {
                        newImageData.data[i] = pixelData[i]
                    }
                    ctx.putImageData(newImageData, 0, 0);

                }
            })
            this.socket.addEventListener("close", (event) => {
                console.log('close event code: ', event.code)
                showErrorMessage(`${CodeMessages[event.code]}`)
                this.resetData()
            })
        },
        joinGame() {
            this.loading = true
            let id = this.urlGameId;
            if (id === null) id = 'banana' // banana is the id used to create a game :)
            this.startWebSocket(id)
        },
        resetData() {
            this.players = { }
            this.admin = ''
            this.name = ''
            this.gameId = ''
            this.loading = false
        },
        startGame() {
            if (!this.socket || this.admin !== this.name || !this.gameId) return // cuz they're trolling
            // send start game message to server
            const startMessage = new SocketMessage(ToServerMessages.START, { name: this.name, gameId: this.gameId })
            this.socket.send(JSON.stringify(startMessage))
        },
        submitPrompt() {
            if (!this.socket || this.gameState !== this.GameStates.PROMPTS || !this.gameId) return
            const promptMessage = new SocketMessage(ToServerMessages.PROMPT, { name: this.name, gameId: this.gameId, prompt: this.promptEdit })
            this.socket.send(JSON.stringify(promptMessage))
            this.promptEdit = ""
        },
        choosePrompt(prompt: Prompt) {
            if (!this.socket || this.gameState !== this.GameStates.DRAWING || !this.gameId) return
            this.prompt = prompt
            this.choices = []
            const promptChoiceMessage = new SocketMessage(ToServerMessages.CHOOSE_PROMPT, {name: this.name, gameId: this.gameId, prompt})
            this.socket.send(JSON.stringify(promptChoiceMessage))
        }
    }
}
</script>

<template>
    <!-- <DrawingCanvas /> -->
    <div class="appContainer">
        <transition mode="out-in"
            enter-from-class="opacity-0"
            leave-to-class="opacity-0"
            enter-active-class="duration-300 ease-in-out"
            leave-active-class="duration-300 ease-in-out"
        >
            <!-- enter name and join screen -->
            <div v-if="!gameId && !loading" class="flex w-full h-full flex justify-center items-center">
                <form @submit.prevent="joinGame">
                    <input class="rounded-l-md border-r-2 border-black outline-none p-2" type="text" placeholder="name" v-model="name">
                    <button class="bg-white rounded-r-md border-l-2 border-black outline-none p-2 hover:bg-gray-400 transition-all" type="submit">{{ urlGameId ? 'join game' : 'create game' }}</button>
                </form>
            </div> 

            <!-- loading screen -->
            <div v-else-if="loading" class="flex w-full h-full flex justify-center items-center">
                <img src="./assets/loading.png" alt="loading..." class="animate-spin">
            </div>

            <!-- in the game screen -->
            <div v-else class="w-full h-full flex justify-center items-center flex-col">
                
                <div v-if="gameState === GameStates.OPEN" class="bg-gray-800 w-3/6 text-white flex flex-col items-start justify-start rounded-xl p-5">
                    gameId: {{ gameId }}
                    <div>Players:</div>
                    <div class="flex flex-row gap-2">
                        <div v-for="player of Object.values(players)" :key="player.name"> {{ admin === player.name ? `${player.name} (admin),` : `${player.name},` }} </div>
                    </div>
                    <div class="flex w-full flex-row justify-end items-center">
                        <transition mode="out-in"
                            enter-active-class="duration-300 ease-in-out"
                            enter-from-class="opacity-0"
                            leave-active-class="duration-300 ease-in-out"
                            leave-to-class="opacity-0"
                        >
                            <button v-if="name === admin" class="border-2 p-1 rounded-lg border-transparent hover:border-white transition-all" @click="startGame">start game</button>
                            <div v-else class="border-2 p-1 rounded-lg border-transparent">waiting for admin to start game...</div>
                        </transition>
                    </div>
                </div>

                <div v-else-if="gameState === GameStates.PROMPTS" class="bg-gray-800 w-3/6 text-white flex flex-col items-start justify-start rounded-xl p-5">
                    <div>You have now begun the prompting stage of the game.</div>
                    <div>
                        Each drawer will select a prompt from a group of prompts written by other players. 
                        The author of a prompt will receive points when their prompt is chosen, 
                        so make your prompts something you would want to draw!
                    </div>
                    <div>Time remaining: {{ timeRemaining }}</div>
                    <form @submit.prevent="submitPrompt">
                        <input type="text" v-model="promptEdit">
                        <button type="submit">submit</button>
                    </form>
                    
                </div>
                <div class="bg-gray-800 w-3/6 text-white flex flex-col items-start justify-start rounded-xl p-5" v-else-if="gameState === GameStates.DRAWING">
                    <modal :show="choices.length > 0">
                        <div class="flex flex-col gap-4 items-center justify-center">
                            <div class="text-2xl">YOU ARE THE DRAWER. CHOOSE A PROMPT:</div>
                            <div class="flex flex-row gap-2">
                                <button type="button" class="p-4 bg-gray-700 text-white rounded-md" v-for="(choice,index) in choices" :key="index" @click="choosePrompt(choice)">{{ choice.prompt }}</button>
                            </div>
                        </div>
                    </modal>
                    <div v-if="Object.keys(prompt).length > 0">currently drawing: {{ prompt.prompt }}</div>
                    <div v-else-if="drawerChosen">{{ drawer }} has chosen a prompt</div>
                    <div v-else>{{ drawer }} is choosing a prompt</div>
                    <DrawingCanvas ref="canvas" :game-id="gameId" :name="name" :socket="socket" :choices="choices" :prompt="prompt" :isDrawer="isDrawer" @choosePrompt="choosePrompt"  />
                </div>

            </div>
        </transition>
    </div>
</template>

<style scoped>

</style>