<script lang="ts">
import ThumbsupIcon from '@/components/icons/IconThumbsup.vue'
import ThumbsdownIcon from '@/components/icons/IconThumbsdown.vue'
import TrophyIcon from '@/components/icons/IconTrophy.vue'
import { HintTypes } from '@/types'

export default {
    components: {
        ThumbsupIcon,
        ThumbsdownIcon,
        TrophyIcon,
    },
    props: {
        guess: String,
    },
    computed: {
        thumbsupText() {
            return 'hint: close!'
        },
        thumbsdownText() {
            return 'hint: not close...'
        },
        selectwinnerText() {
            return 'select winner!'
        },
        originalTooltipText() {
            return `“${this.guess}”`
        }
    },
    data() {
        return {
            HintTypes,
            tooltip: '',
        }
    },
    mounted() {
        this.tooltip = this.originalTooltipText
    },
    emits: ['provideHint', 'selectWinner'],
}
</script>

<template>
    <div class="flex flex-col justify-between w-full h-full" @mouseleave="tooltip = originalTooltipText">
        <div class="flex justify-around items-center">
            <div
                @click="$emit('provideHint', HintTypes.CLOSE)" 
                @mouseenter="tooltip = thumbsupText"
            >
                <ThumbsupIcon class="w-8 h-8 cursor-pointer drop-shadow hover:scale-100 scale-90 transition text-emerald-900" />
            </div>
            <div
                class="" 
                @click="$emit('provideHint', HintTypes.FAR)"
                @mouseenter="tooltip = thumbsdownText"
            >
                <ThumbsdownIcon class="w-8 h-8 cursor-pointer drop-shadow hover:scale-100 scale-90 transition text-red-900" />
            </div>
            <div
                class="" 
                @click="$emit('selectWinner')"
                @mouseenter="tooltip = selectwinnerText"
            >
                <TrophyIcon class="w-8 h-8 cursor-pointer drop-shadow hover:scale-100 scale-90 transition text-yellow-900" />
            </div>
        </div>
        <transition
            enter-from-class="opacity-0"
            leave-to-class="opacity-0"
            enter-active-class="duration-200 ease-in-out"
            leave-active-class="duration-200 ease-in-out"
            mode="out-in"
        >
            <div class="flex justify-center" :key="tooltip">{{ tooltip }}</div>
        </transition>
    </div>
</template>