<script lang="ts">
import { SocketMessage, ToClientMessages, ToServerMessages, Player, CodeMessages, GameStates, HintTypes } from './types';
import type { Hint, JoinSuccessData, JoinDataToClient, LeaveDataToClient, ErrorDataToClient, PromptSuccessDataToClient, NewRoundDataToClient, Prompt, TimeRemainingDataToClient, DrawDataToClient, GuessDataToClient } from './types'
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
        timer: 3000,
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
            guesses: {} as {[key: string]: string},
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
            drawerChosen: false,
            guessEdit: "",
            guess: "",
            hints: [] as Hint[]
        }
    },
    components: {
        DrawingCanvas,
        modal: TransitionModal
    },
    mounted() {
    },
    computed: {
        urlGameId() {
            const usp = new URLSearchParams(window.location.search)
            const gameId = usp.get('gameId')
            return gameId
        },
        isDrawer() {
            return this.drawer === this.name
        },
        HintTypes() {
            return HintTypes
        }
    },
    methods: {
        syncElementHeights() {
            console.log('started syncing')
            const mainColumn = this.$refs.mainColumn as HTMLElement
            const rightColumn = this.$refs.rightColumn as HTMLElement
            if (!mainColumn || !rightColumn) return
            rightColumn.style.height = mainColumn.offsetHeight + 'px';
            console.log('finished syncing')
        },
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
                    this.drawerChosen = false
                    this.guesses = {}
                    this.choices = []
                    this.hints = []
                    this.guess = ""
                } else if (action === ToClientMessages.CHOICES) {
                    const data = json.data as Prompt[]
                    this.choices = data

                } else if (action === ToClientMessages.TIME_REMAINING) {
                    const data = json.data as TimeRemainingDataToClient
                    this.timeRemaining = data.timeRemaining
                } else if (action === ToClientMessages.DRAWER_CHOSEN) {
                    this.drawerChosen = true
                } else if (action === ToClientMessages.DRAW) {
                    //@ts-ignore
                    const ctx = (this.$refs.canvas.$refs.canvas as HTMLCanvasElement).getContext('2d', { willReadFrequently: true }) 
                    if (!ctx) return

                    const data = json.data as DrawDataToClient
                    const w = data.width
                    const h = data.height
                    if (ctx.canvas.width !== w || ctx.canvas.height !== h) return

                    const pixelData = data.pixels
                    const newImageData = ctx.createImageData(w, h)

                    // Copy the pixelData into the new ImageData object
                    for (let i = 0; i < pixelData.length; i +=4) {
                        newImageData.data[i] = pixelData[i]
                        newImageData.data[i+1] = pixelData[i+1]
                        newImageData.data[i+2] = pixelData[i+2]
                        newImageData.data[i+3] = 255
                    }
                    ctx.putImageData(newImageData, 0, 0);

                } else if (action === ToClientMessages.GUESS) {
                    const data = json.data as GuessDataToClient
                    this.guesses[data.name] = data.guess
                } else if (action === ToClientMessages.HINT) {
                    const data = json.data as Hint
                    this.hints.push(data)
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
            if (!this.socket || this.gameState !== GameStates.PROMPTS || !this.gameId) return
            const promptMessage = new SocketMessage(ToServerMessages.PROMPT, { name: this.name, gameId: this.gameId, prompt: this.promptEdit })
            this.socket.send(JSON.stringify(promptMessage))
            this.promptEdit = ""
        },
        choosePrompt(prompt: Prompt) {
            if (!this.socket || this.gameState !== GameStates.DRAWING || !this.gameId) return
            this.prompt = prompt
            this.choices = []
            const promptChoiceMessage = new SocketMessage(ToServerMessages.CHOOSE_PROMPT, {name: this.name, gameId: this.gameId, prompt})
            this.socket.send(JSON.stringify(promptChoiceMessage))
        },
        submitGuess() {
            if (!this.socket || this.gameState !== GameStates.DRAWING || !this.gameId || this.isDrawer) return
            const guessMessage = new SocketMessage(ToServerMessages.GUESS, { name: this.name, guess: this.guessEdit, gameId: this.gameId })
            this.socket.send(JSON.stringify(guessMessage))
            this.guess = this.guessEdit
            this.guessEdit = ""
        },
        sendHint(guess: string, type: string) {
            if (!this.socket || this.gameState !== GameStates.DRAWING || !this.gameId || !this.isDrawer) return
            const hintMessage = new SocketMessage(ToServerMessages.HINT, { gameId: this.gameId, guess, type, name: this.name })
            this.socket.send(JSON.stringify(hintMessage))
            showSuccessMessage(`Sent hint for guess '${guess}'!`)
        }
    }
}
</script>

<template>
    <!-- <DrawingCanvas /> -->
    
    <div class="appContainer ">
        <transition mode="out-in"
            enter-from-class="opacity-0"
            leave-to-class="opacity-0"
            enter-active-class="duration-300 ease-in-out"
            leave-active-class="duration-300 ease-in-out"
        >
            <div class="flex h-10 gap-4">
                <img src="./assets/thumbsup.png" class="h-8 cursor-pointer transition-all hover:scale-125 hover:-translate-y-1" style="image-rendering: pixelated;" alt="thumbsup">
                <img src="./assets/thumbsdown.png" class="h-8 cursor-pointer self-end transition-all hover:scale-125 hover:-translate-y-1" style="image-rendering: pixelated;" alt="thumbsdown">
            </div>

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
                        <input class="text-black rounded-l-md border-r-2 border-black outline-none p-2" type="text" v-model="promptEdit">
                        <button class="text-black bg-white rounded-r-md border-l-2 border-black outline-none p-2 hover:bg-gray-400 transition-all" type="submit">submit</button>
                    </form>
                    
                </div>
                <div v-else-if="gameState === GameStates.DRAWING" class="text-white flex items-start justify-center">
                    <div class="flex flex-col items-end bg-neutral-900 rounded-md">
                        <modal :show="choices.length > 0">
                            <div class="flex flex-col gap-4 items-center justify-center">
                                <div class="text-2xl">YOU ARE THE DRAWER. CHOOSE A PROMPT:</div>
                                <div class="flex flex-row gap-2">
                                    <button type="button" class="p-4 bg-gray-700 text-white rounded-md" v-for="(choice,index) in choices" :key="index" @click="choosePrompt(choice)">{{ choice.prompt }}</button>
                                </div>
                            </div>
                        </modal>
                        <div class="flex w-full justify-center items-center text-xl p-8">
                            <div v-if="Object.keys(prompt).length > 0">currently drawing: {{ prompt.prompt }}</div>
                            <div v-else-if="drawerChosen">{{ drawer }} is drawing...</div>
                            <div v-else>{{ drawer }} is choosing a prompt</div>
                        </div>
                        <DrawingCanvas ref="canvas" :game-id="gameId" :name="name" :socket="socket" :choices="choices" :prompt="prompt" :isDrawer="isDrawer" @choosePrompt="choosePrompt"  />
                        <div v-if="!isDrawer" class="flex flex-col w-full">
                            <div class="flex w-full p-8 pb-0">
                                current guess: {{ guess }}
                            </div>
                            <div class="flex w-full justify-end items-center p-8">
                                <form @submit.prevent="submitGuess">
                                    <input class="text-black rounded-l-sm border-r-2 border-black outline-none p-2" type="text" placeholder="Type your guess here..." v-model="guessEdit">
                                    <button class="text-black bg-white rounded-r-sm border-l-2 border-black outline-none p-2 hover:bg-gray-400 transition-all" type="submit">submit</button>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div v-if="isDrawer" class="flex flex-col w-full">
                        <div class="flex gap-2 items-center" v-for="guess, author in guesses" :key="author">
                            <div>{{ guess }}</div> <button class="px-2 py-1 bg-gray-700 rounded-md" @click="sendHint(guess, HintTypes.CLOSE)">close</button> <button class="px-2 py-1 bg-gray-700 rounded-md" @click="sendHint(guess, HintTypes.FAR)">not close</button>
                        </div>
                    </div>
                    <div v-else class="flex flex-col justify-end p-4 bg-neutral-900 border-l-4 border-neutral-500 overflow-y-scroll">
                        <transition-group
                            enter-active-class="duration-500 ease-in-out"
                            enter-from-class="opacity-0 translate-y-1/2"
                            leave-active-class="duration-500 ease-in-out"
                            leave-to-class="opacity-0 translate-y-1/2"
                            move-class="translate-y-1/2"
                        >
                            <div
                                v-for="{ guess, type } in hints" :key="guess"
                                class="text-white"
                                :class="{
                                    'text-red-600': type === HintTypes.FAR,
                                    'text-green-500': type === HintTypes.CLOSE
                                }"
                            >
                                {{ `'${guess}' ${type}!` }}
                            </div>
                        </transition-group>
                    </div>
                </div>

            </div>
        </transition>
    </div>
</template>

<style scoped>

</style>