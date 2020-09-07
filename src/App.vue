<template>
  <v-app id="app">
    <GithubCorner url="https://github.com/Gollum999/vctr.xyz" :size='$vuetify.breakpoint.smAndDown ? 20 : 60'
                  cornerColor="#272727" gitColor="white" />
    <router-view/>
  </v-app>
</template>

<script>
import GithubCorner from 'vue-github-corners';
export default {
    name: 'App',
    components: {
        GithubCorner,
    },
};
</script>

<style lang="sass">
// NOTE: Do not use this block for global styling.  Styles will be applied in a different order once deployed.  Use global.css instead.

@import url('https://fonts.googleapis.com/css?family=Ubuntu')
@import url('https://fonts.googleapis.com/icon?family=Material+Icons')
</style>
