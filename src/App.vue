<script lang="ts">
import { SocketMessage, ToClientMessages, ToServerMessages, Player, CodeMessages, GameStates, HintTypes } from './types';
import type { StartDataToClient, Hint, RoundEndInfo, EndRoundDataToClient, JoinSuccessData, JoinDataToClient, LeaveDataToClient, ErrorDataToClient, PromptSuccessDataToClient, NewRoundDataToClient, Prompt, TimeRemainingDataToClient, DrawDataToClient, GuessDataToClient } from './types'
import Swal from 'sweetalert2'

import loadingImage from './assets/loading.png'

import DrawingCanvas from '@/components/DrawingCanvas.vue'
import TransitionModal from '@/components/TransitionModal.vue'
import { is } from '@babel/types';

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
            gameState: GameStates.OVER,
            loading: false,
            promptEdit: "",
            roundNum: -1,
            drawer: "",
            choices: [] as Prompt[],
            prompt: {} as Prompt,
            showChoiceModal: false,
            drawerChosen: false,
            guessEdit: "",
            guess: "",
            hints: [] as Hint[],
            roundEndModal: { shown: false } as RoundEndInfo,
            showchoices: false,
            promptsPP: 0,
            finalScores: [] as { name: string, score: number }[],
            totalDrawings: 3,
            copyGameLinkText: 'copy game link',
            promptsEdit: [] as string[]
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
        gameLink() {
            return `${window.location.origin}?gameId=${this.gameId}`
        },
        redirectLink() {
            return window.location.origin
        },
        isDrawer() {
            return this.drawer === this.name
        },
        HintTypes() {
            return HintTypes
        }
    },
    methods: {
        kickPlayer(playerToKick: string) {
            if (!this.socket || this.admin !== this.name || !this.gameId) return // cuz they're trolling
            const kickMessage = new SocketMessage(ToServerMessages.KICK, { name: this.name, gameId: this.gameId, playerToKick })
            this.socket.send(JSON.stringify(kickMessage))
        },
        setUrlGameId(gameId: string) {
            const usp = new URLSearchParams(window.location.search)
            usp.set('gameId', gameId)
            const newUrl = this.gameLink
            history.pushState(null, '', newUrl)
        },
        simplehash(str: string) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const charCode = str.charCodeAt(i) * 20;
                hash += charCode;
            }
            return hash;
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
                const json: SocketMessage = JSON.parse(event.data)
                const action = json.action
                if (action === ToClientMessages.JOIN_SUCCESS) {
                    const data = json.data as JoinSuccessData
                    this.players = {}
                    data.players.forEach((name) => {
                        this.players[name] = new Player(name)
                    })
                    this.admin = data.admin
                    this.gameId = data.gameId
                    this.setUrlGameId(data.gameId)
                    this.gameState = GameStates.OPEN
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
                    // data should be empty obj, don't do anything with it. JK NOW IT HAS PROMPT NUMBER
                    const data = json.data as StartDataToClient
                    this.promptsPP = data.promptsPP
                    this.gameState = GameStates.PROMPTS
                } else if (action === ToClientMessages.PROMPT_SUCCESS) {
                    const data = json.data as PromptSuccessDataToClient
                    showSuccessMessage(`Submitted: "${data.prompt}"`)
                    this.promptsEdit.push(data.prompt)

                } else if (action === ToClientMessages.NEW_ROUND) {
                    const data = json.data as NewRoundDataToClient
                    this.gameState = GameStates.DRAWING
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
                    if (this.roundNum <= 1) this.showchoices = true

                } else if (action === ToClientMessages.TIME_REMAINING) {
                    const data = json.data as TimeRemainingDataToClient
                    // this.timeRemaining = data.timeRemaining
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
                } else if (action === ToClientMessages.END_ROUND) {
                    const data = json.data as EndRoundDataToClient
                    this.showchoices = false
                    this.roundEndModal = {
                        shown: true,
                        winnerScore: this.players[data.winner].score,
                        promptAuthorScore: this.players[data.promptAuthor].score,
                        promptAuthor: data.promptAuthor,
                        winner: data.winner,
                        guess: data.guess,
                        prompt: data.oldPrompt,
                        step: 0
                    }
                    const delay = 3000
                    setTimeout(() => {
                        this.roundEndModal.step++
                        setTimeout(() => {
                            this.roundEndModal.step++
                            setTimeout(() => {
                                this.roundEndModal.winnerScore = data.winnerScore
                                this.roundEndModal.promptAuthorScore = data.promptAuthorScore
                                setTimeout(() => {
                                    this.roundEndModal.step = -1
                                    setTimeout(() => {
                                        this.drawer = data.drawer
                                        this.roundNum = data.roundNum
                                        this.players[data.winner].score = data.winnerScore
                                        this.players[data.promptAuthor].score = data.promptAuthorScore
                                        this.guess = ''
                                        this.guessEdit = ''
                                        this.hints = []
                                        this.drawerChosen = false
                                        this.prompt = {} as Prompt
                                        this.guesses = {}
                                        const canvas = this.$refs.canvas as typeof DrawingCanvas
                                        canvas.clearCanvas()
                                        this.roundEndModal = { shown: false } as RoundEndInfo
                                        this.showchoices = true
                                        if (data.over) this.gameState = GameStates.OVER
                                    }, delay / 2)
                                }, delay)
                            }, delay / 2)
                        }, delay)
                    }, delay)                                   
                    
                } else if (action === ToClientMessages.GAME_OVER) {
                    const data = json.data as { name: string, score: number }[]
                    // this.gameState = GameStates.OVER // this is now done when the round ends, this message just transfers scores
                    this.finalScores = data
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
            this.players = {}
            this.guesses = {}
            this.admin = ''
            this.name = ''
            this.gameId = ''
            this.loading = false
            this.gameState = GameStates.OPEN
            this.promptEdit = ''
            this.roundNum = -1
            this.drawer = ''
            this.choices = []
            this.prompt = {} as Prompt
            this.showChoiceModal = false
            this.drawerChosen = false
            this.guessEdit = ''
            this.guess = ''
            this.hints = []
            this.roundEndModal = { shown: false } as RoundEndInfo
            this.showchoices = false
            this.promptsPP = 0
            this.finalScores = [] as { name: string, score: number }[]
            this.totalDrawings = 3,
            this.promptsEdit = []
        },
        startGame() {
            if (!this.socket || this.admin !== this.name || !this.gameId) return // cuz they're trolling
            // send start game message to server
            const startMessage = new SocketMessage(ToServerMessages.START, { name: this.name, gameId: this.gameId, rounds: this.totalDrawings })
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
            this.showchoices = false
            const promptChoiceMessage = new SocketMessage(ToServerMessages.CHOOSE_PROMPT, {name: this.name, gameId: this.gameId, prompt})
            this.socket.send(JSON.stringify(promptChoiceMessage))
        },
        submitGuess() {
            console.log('here')
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
        },
        selectWinner(guess: string, winner: string) {
            if (!this.socket || this.gameState !== GameStates.DRAWING || !this.gameId || !this.isDrawer || winner === this.name) return
            const selectWinnerMessage = new SocketMessage(ToServerMessages.SELECT_WINNER, { gameId: this.gameId, name: this.name, guess, winner })
            this.socket.send(JSON.stringify(selectWinnerMessage))
            console.log('sent select winner message!')
        },
        playAgain() {
            if (!this.socket || this.gameState !== GameStates.OVER || !this.gameId || this.admin !== this.name) return
            const playAgainMessage = new SocketMessage(ToServerMessages.PLAY_AGAIN, { gameId: this.gameId, name: this.name })
            this.socket.send(JSON.stringify(playAgainMessage))
        },
        async copyGameLink() {
            try {
                await navigator.clipboard.writeText(this.gameLink)
                this.copyGameLinkText = '✔'
            } catch (e) {
                console.error('Error copying game link',  e)
                this.copyGameLinkText = '✖'
            }
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
            <!-- <div class="flex h-10 gap-4">
                <img src="./assets/thumbsup.png" class="h-8 cursor-pointer transition-all hover:scale-125 hover:-translate-y-1" style="image-rendering: pixelated;" alt="thumbsup">
                <img src="./assets/thumbsdown.png" class="h-8 cursor-pointer self-end transition-all hover:scale-125 hover:-translate-y-1" style="image-rendering: pixelated;" alt="thumbsdown">
            </div> -->

            <!-- enter name and join screen -->
            <div v-if="!gameId && !loading" class="flex flex-col gap-10 w-full items-center">
                <!-- <form @submit.prevent="joinGame" class="border-4 border-black rounded-lg overflow-hidden w-fit">
                    <input class="border-r border-black outline-none p-2" type="text" placeholder="name" v-model="name">
                    <button class="bg-white border-l border-black outline-none p-2 hover:bg-gray-400 transition-all" type="submit">{{ urlGameId ? 'join game' : 'create game' }}</button>
                </form> -->
                <div class="flex flex-row justify-center w-full">
                    <a :href="redirectLink">
                        <img src="./assets/dPictionLogo.png" class="h-40 logo-shadow" alt="logo">
                    </a>
                </div>
                <div class="rounded-[30px] shadow-[0.3rem_0.3rem_#555] border-[6px] border-black p-8 bg-white text-black flex flex-col gap-2 items-start justify-start w-[800px]">
                    
                    <div class="text-lg text-center w-full">Welcome to dpiction!</div>
                    <div v-if="!urlGameId" class="text-lg w-full text-justify">
                        Pictionary with a twist! During a game of dpiction,
                        players first write their own prompts to be used during the game.
                        During each round, a drawer chooses a prompt from a list, one from each other player.
                        The author of the chosen prompt is rewarded, as well as the player with the best guess
                        during each round, which is decided by the drawer. To create a game, enter your name and click
                        <strong>create game</strong> below. To join someone else's game, enter their game link into your browser.
                    </div>
                    <div v-else class="text-lg w-full text-center whitespace-nowrap overflow-hidden text-ellipsis">
                        You are attempting to join game {{ urlGameId }}...
                    </div>

                </div>
                <div class="flex justify-center">
                    <form @submit.prevent="joinGame" class="w-fit rounded-[10px] shadow-[0.25rem_0.25rem_#888] bg-white text-black flex items-start justify-start">
                        <input 
                            class="text-black rounded-l-[10px] border-4 border-r-2 border-black outline-none p-2 focus:border-[#444]" 
                            type="text" 
                            v-model="name"
                            placeholder="Enter your name..."
                            maxlength="20"
                            required
                        />
                        <button 
                            class="text-black bg-white rounded-r-[10px] border-4 border-l-2 border-black outline-none p-2 hover:border-[#444] focus:border-[#444] transition-all" 
                            type="submit"
                        >
                            {{ urlGameId ? 'join game' : 'create game' }}
                        </button>

                    </form>                             
                </div>
            </div> 

            <!-- loading screen -->
            <div v-else-if="loading" class="flex fixed top-0 left-0 w-screen h-screen justify-center items-center">
                <img src="./assets/loading.png" alt="loading..." class="animate-spin">
            </div>

            <!-- in the game screen -->
            <div v-else-if="gameState === GameStates.OPEN" class="w-3/6 flex flex-col gap-6">
                <div class="rounded-[30px] shadow-[0.5rem_0.5rem_#555] border-8 border-black p-8 pb-4 bg-white text-black flex flex-col gap-2 items-start justify-start">
                    
                    <div class="font-bold text-lg">PLAYERS</div>
                    <div class="flex flex-row gap-2 flex-wrap w-full">
                        <div v-for="player of Object.values(players)" :key="player.name" class="flex items-center border-2 border-black rounded-full px-2 h-8 text-lg whitespace-nowrap gap-1"
                            :style="{ 'background-color': `hsl(${simplehash(player.name) % 360}deg, 100%, 85%)`}"
                        >
                            <!-- heroicon: outline/sparkles -->
                            <svg v-if="admin === player.name" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                            </svg>
                            {{ player.name }} 
                            <svg v-if="admin === name && player.name !== admin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
                                class="w-5 cursor-pointer hover:scale-1"
                                @click="kickPlayer(player.name)"
                            >
                                <path stroke-linecap="round" stroke-linejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                            </svg>
                        </div>
                    </div>
                    <div v-if="name === admin" class="flex flex-col w-full mt-4">
                        <div class="font-bold text-lg w-fit">GAME SETTINGS</div>
                        <div class="flex gap-3 bg-white py-2 px-3 rounded-xl items-center border-neutral-500 text-black">
                            <div class="flex gap-1 items-center text-lg h-4">total drawings: <span class="w-6 text-center">{{ totalDrawings }}</span></div>
                            <div class="flex flex-col items-center">
                                <button type="button" class="flex-1 leading-4 hover:scale-150 transition-all p-0.5" @click="totalDrawings++">+</button>
                                <button type="button" class="flex-1 leading-4 hover:scale-150 transition-all p-0.5" @click="totalDrawings -= totalDrawings > 0 ? 1 : 0">-</button>
                            </div>
                        </div>
                    </div>
                    <div class="flex w-full flex-row justify-end items-center">
                        <transition mode="out-in"
                            enter-active-class="duration-300 ease-in-out"
                            enter-from-class="opacity-0"
                            leave-active-class="duration-300 ease-in-out"
                            leave-to-class="opacity-0"
                        >
                            <button v-if="name === admin" class="border-2 p-1 rounded-lg border-transparent hover:border-white transition-all hover:scale-110" @click="startGame">start game</button>
                            <div v-else class="border-2 p-1 rounded-lg border-transparent">waiting for {{ admin }} to start game...</div>
                        </transition>
                    </div>
                </div>
                <div class="flex justify-end">
                    <div class="flex w-3/4 shadow-[0.3rem_0.3rem_#555] border-4 border-black rounded-[20px]">
                        <div class="border-r border-black p-2 px-4 whitespace-nowrap overflow-hidden text-ellipsis bg-white rounded-l-[20px]">{{ gameLink }}</div>
                        <div class="border-l border-black p-2 text-center w-52 whitespace-nowrap cursor-pointer hover:bg-opacity-70 bg-white rounded-r-[20px] transition-all" @click="copyGameLink">
                            <transition mode="out-in" nter-active-class="duration-200 ease-in-out" enter-from-class="opacity-0" leave-active-class="duration-200 ease-in-out" leave-to-class="opacity-0">
                                <span :key="copyGameLinkText">{{ copyGameLinkText }}</span>
                            </transition>
                        </div>
                    </div>
                </div>
            </div> 

            <div v-else-if="gameState === GameStates.PROMPTS" class="w-[600px] flex flex-col gap-6">
                <div class="rounded-[30px] shadow-[0.5rem_0.5rem_#555] border-8 border-black p-8 bg-white text-black flex flex-col gap-2 items-start justify-start">
                    <div class="w-full text-center">SUBMIT {{ promptsPP }} PROMPTS</div>
                    <div class="w-full text-justify">
                        Write and submit prompts to be used in the game. During each round, the drawer 
                        chooses from a list consisting of one prompt from each other player. The author of 
                        the selected prompt will receive points at the end of the round, so try to write prompts
                        that will get selected, whether that be for being funny, clever, or fun to draw!
                    </div>       
                </div>
                <div class="flex justify-center">
                    <form @submit.prevent="submitPrompt" class="w-fit rounded-[10px] shadow-[0.25rem_0.25rem_#888] bg-white text-black flex items-start justify-start">
                        <input 
                            class="text-black rounded-l-[10px] border-4 border-r-2 border-black outline-none p-2 focus:border-[#444]" 
                            type="text" 
                            v-model="promptEdit"
                            placeholder="Enter your prompt here..."
                            maxlength="50"
                            required
                        >
                        <button class="text-black bg-white rounded-r-[10px] border-4 border-l-2 border-black outline-none p-2 hover:border-[#444] focus:border-[#444] transition-all" type="submit">submit</button>

                    </form>                             
                </div>
            </div>
            <div v-else-if="gameState === GameStates.DRAWING" class="text-white flex items-start justify-center">
                <div class="flex flex-col items-end bg-neutral-900 rounded-md ">
                    <modal :show="choices.length > 0 && showchoices">
                        <div class="flex flex-col gap-4 items-center justify-center">
                            <div class="text-2xl">YOU ARE THE DRAWER. CHOOSE A PROMPT:</div>
                            <div class="flex flex-row gap-2">
                                <button type="button" class="p-4 bg-neutral-700 text-white rounded-md" v-for="(choice,index) in choices" :key="index" @click="choosePrompt(choice)">{{ choice.prompt }}</button>
                            </div>
                        </div>
                    </modal>
                    <div class="flex w-full justify-center items-center text-xl p-8">
                        <div v-if="Object.keys(prompt).length">currently drawing: {{ prompt.prompt }}</div>
                        <div v-else-if="drawerChosen">{{ drawer }} is drawing...</div>
                        <div v-else>{{ drawer }} is choosing a prompt</div>
                    </div>
                    <DrawingCanvas ref="canvas" :game-id="gameId" :name="name" :socket="socket" :choices="choices" :prompt="prompt" :isDrawer="isDrawer" @choosePrompt="choosePrompt"  />
                    <div v-if="!isDrawer" class="flex flex-col w-full">
                        <div class="flex w-full p-8 pb-0">{{guess ? `current guess: ${guess}`: 'Enter your guess below:'}}</div>
                        <div class="flex w-full justify-end items-center p-8">
                            <form @submit.prevent="submitGuess">
                                <input class="text-black rounded-l-sm border-r-2 border-black outline-none p-2" type="text" placeholder="Type your guess here..." v-model="guessEdit">
                                <button class="text-black bg-white 4545rounded-r-sm border-l-2 border-black outline-none p-2 hover:bg-neutral-400 transition-all" type="submit">submit</button>
                            </form>
                        </div>
                    </div>
                </div>
                <div v-if="isDrawer" class="flex flex-col w-full">
                    <div class="flex gap-2 items-center" v-for="(guess, author) in guesses" :key="author">
                        <div>{{ guess }}</div> 
                        <button class="px-2 py-1 rounded-md" @click="sendHint(guess, HintTypes.CLOSE)">✅</button> 
                        <button class="px-2 py-1 rounded-md" @click="sendHint(guess, HintTypes.FAR)">❌</button>
                        <button class="px-2 py-1 rounded-md" @click="selectWinner(guess, author.toString())">🥇</button>
                    </div>
                </div>
                <div v-else class="flex flex-col justify-end p-4 bg-neutral-900 border-l-4 border-neutral-500 self-stretch overflow-y-scroll">
                    <transition-group
                        enter-active-class="duration-500 ease-in-out"
                        enter-from-class="opacity-0 translate-y-1/2"
                        leave-active-class="duration-500 ease-in-out"
                        leave-to-class="opacity-0 translate-y-1/2"
                        move-class="duration-500 ease-in-out"
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
                <modal :show="roundEndModal.shown">
                    <div class="h-full flex flex-col items-center text-2xl gap-10 text-black font-normal">
                        <transition-group
                            enter-active-class="duration-500 ease-in-out transition-all"
                            enter-from-class="opacity-0 -translate-x-full"
                            leave-active-class="duration-500 ease-in-out transition-all"
                            leave-to-class="opacity-0 translate-x-full"
                            move-class="duration-500 ease-in-out transition-all"
                        >
                            <div v-if="roundEndModal.step >= 0" class="flex flex-col gap-2 items-center bg-white p-8 rounded-[30px] border-8 border-black shadow-[0.5rem_0.5rem_#555]">
                                <div class="">the prompt was...</div>
                                <div class="flex flex-col items-center text-neutral-800">
                                    <div>"{{ roundEndModal.prompt }}"</div>
                                    <div class="self-end">— {{ roundEndModal.promptAuthor }}</div>
                                </div>
                            </div>
                            <div v-if="roundEndModal.step >= 1" class="flex flex-col gap-2 items-center bg-white p-8 rounded-[30px] border-8 border-black shadow-[0.5rem_0.5rem_#555]">
                                <div>the winning guess was...</div>
                                <div class="flex flex-col items-center text-neutral-800">
                                    <div>"{{ roundEndModal.guess }}"</div>
                                    <div class="self-end">— {{ roundEndModal.winner }}</div>
                                </div>
                            </div>
                            <div v-if="roundEndModal.step >= 2" class="flex flex-col items-center gap-2 w-full bg-white p-8 rounded-[30px] border-8 border-black shadow-[0.5rem_0.5rem_#555]">
                                <div>updated scores:</div>
                                <div class="flex flex-col self-start text-neutral-800">
                                    <div class="flex justify-between gap-8">
                                        <div>{{ roundEndModal.promptAuthor }}:</div>
                                        <transition
                                            mode="out-in"
                                            enter-active-class="duration-1000 ease-in-out transition-all"
                                            leave-active-class="duration-400 ease-in-out transition-all"
                                            enter-from-class="-translate-x-10 opacity-0"
                                            leave-to-class="translate-x-10 opacity-0"
                                        >
                                            <div :key="roundEndModal.promptAuthorScore">{{ roundEndModal.promptAuthorScore }}</div>
                                        </transition>
                                    
                                    </div>
                                    <div class="w-full flex justify-between">
                                        <div >{{ roundEndModal.winner }}:</div>
                                        <transition
                                            mode="out-in"
                                            enter-active-class="duration-1000 ease-in-out transition-all"
                                            leave-active-class="duration-400 ease-in-out transition-all"
                                            enter-from-class="translate-x-10 opacity-0"
                                            leave-to-class="-translate-x-10 opacity-0"
                                        >
                                            <div :key="roundEndModal.winnerScore">{{ roundEndModal.winnerScore }}</div>
                                        </transition>
                                    </div>
                                </div>
                            </div>
                        </transition-group>
                    </div>
                </modal>
            </div>
            <div v-else-if="gameState === GameStates.OVER" class="bg-neutral-800 bg-opacity-80 w-3/6 text-black text-2xl flex flex-col gap-4 items-center justify-start rounded-2xl p-4 pt-12">
                <div class="font-bold text-3xl text-white">GAME OVER</div>
                <div class="mt-2 text-white">Here are the final scores:</div>
                <div class="w-3/4 mt-8 border-4 border-black rounded-xl overflow-hidden">
                    <table class="w-full">
                        <tr class="py-10 bg-white">
                            <th class="w-1/6 py-1"></th>
                            <th class="py-1 border-l border-neutral-600">Player</th>
                            <th class="w-1/6 px-3 py-1 border-l border-neutral-600">Score</th>
                        </tr>
                        <tr 
                            v-for="(score, i) in finalScores" 
                            :key="i" 
                            class=""
                            :class="{'bg-neutral-100': i % 2 === 0, 'bg-white': i % 2 === 1}"
                        >
                            <td class="text-center text-neutral-600">{{ i + 1 }}</td>
                            <td class="text-left border-l border-neutral-600 px-4">{{ score.name }}</td>
                            <td class="text-center border-l border-neutral-600">{{ score.score }}</td>
                        </tr>
                    </table>
                </div>
                <div v-if="admin === name" class="w-full flex justify-end">
                    <button 
                        type="button" 
                        class="bg-white text-lg rounded-2xl py-2 px-4 border-4 border-black hover:-translate-x-1 hover:-translate-y-1 transition-all"
                        @click="playAgain"
                    >
                        play again
                    </button>
                </div>
            </div>

        </transition>
    </div>
</template>

<style scoped>
.endRoundModalNote {
}
</style>