<template>
  <v-app id="app">
    <router-view/>
  </v-app>
</template>

<script>
export default {
    name: 'App',
};
</script>

<style lang="sass">
// NOTE: Do not use this block for global styling.  Styles will be applied in a different order once deployed.  Use global.css instead.

@import url('https://fonts.googleapis.com/css?family=Ubuntu')
@import url('https://fonts.googleapis.com/icon?family=Material+Icons')

#app
  width: 100vw
  height: 100vh
  .v-application--wrap
    min-height: initial // Fix useless scrollbar // TODO not sure why this is happening
</style>
