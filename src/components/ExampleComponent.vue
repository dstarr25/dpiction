<template>
    <section>
        <p v-if="num > 0">the number is {{ num }}</p>
        <p v-else>the number is zero.</p>

        <button v-on:click="inc()">click for something to happen</button>
    </section>
</template>

<script lang="ts">
export default {
    name: 'ExampleComponent',
    data() {
        return {
            num: 0
        }
    },  
    methods: {
        inc() {
            this.num++
        }
    }
}
</script>