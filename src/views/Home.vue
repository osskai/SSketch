<template>
    <div class="home">
        <Sketch></Sketch>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from 'vue-property-decorator';
    import Sketch from "@/views/Sketch.vue";

    @Component({
        components: {
            Sketch
        }
    })
    export default class Home extends Vue {
    }
</script>
