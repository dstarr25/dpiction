<template>
    <transition
        name="fade"
        appear
    >
        <div v-if="show" class="z-40 bg-gray-700 opacity-60 fixed inset-0" @click="$emit('close')"></div>
    </transition>

    <transition
        name="descend"
        appear
    >
        <div v-if="show" class="z-50 inset-0 pointer-events-none fixed flex flex-col justify-center items-center">
            <div class="pointer-events-auto">
                <slot  />

            </div>
        </div>
    </transition>
    
    
    
</template>

<script lang="ts">
export default {
    props: {
        show: Boolean
    }
}
</script>

<style scoped>

.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.descend-enter-active,
.descend-leave-active {
  transition: all 0.3s ease;
}

.descend-enter-from,
.descend-leave-to {
  transform: translateY(-5%);
  opacity: 0;
}

</style>