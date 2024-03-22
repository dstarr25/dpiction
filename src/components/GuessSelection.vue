<script lang="ts">
import ThumbsupIcon from '@/components/icons/IconThumbsup.vue'
import ThumbsdownIcon from '@/components/icons/IconThumbsdown.vue'
import TrophyIcon from '@/components/icons/IconTrophy.vue'

export default {
    components: {
        ThumbsupIcon,
        ThumbsdownIcon,
        TrophyIcon,
    },
}
</script>

<template>
    <div class="flex flex-col justify-between">
        <div class="flex justify-around items-center">
            <div class=""><ThumbsupIcon class="w-8 h-8 cursor-pointer drop-shadow hover:scale-100 scale-90 transition text-emerald-900" /></div>
            <div class=""><ThumbsdownIcon class="w-8 h-8 cursor-pointer drop-shadow hover:scale-100 scale-90 transition text-red-900" /></div>
            <div class=""><TrophyIcon class="w-8 h-8 cursor-pointer drop-shadow hover:scale-100 scale-90 transition text-yellow-900" /></div>
        </div>
    </div>
</template>