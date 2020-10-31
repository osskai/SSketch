<template>
    <div class="login">
        <h1>This is an Login page</h1>
    </div>
</template>

<script lang="ts">
    import {Component, Vue} from 'vue-property-decorator';
    import {addToken, removeToken} from "@/utils/common";

    @Component({})
    export default class Login extends Vue {
        mounted(): void {
            addToken('login');
        }

        destroyed(): void {
            removeToken();
        }
    }
</script>

<style scoped>

</style>
