<template>
  <b-container id="app">
    <router-view/>
  </b-container>
</template>

<script>
export default {
    name: 'App',
};
</script>

<style lang="sass">
@import url('https://fonts.googleapis.com/css?family=Ubuntu')

html.md-theme-default,body
  background-color: #333333

#app
  font-family: Ubuntu, Avenir, Helvetica, Arial, sans-serif
  font-size: 12px
  -webkit-font-smoothing: antialiased
  -moz-osx-font-smoothing: grayscale
  text-align: center
  color: #2c3e50
  margin-top: 60px
  height: 100%
  .container
    min-height: 100vh
    // max-height: 100vh

.md-select-menu
  font-family: Ubuntu, Avenir, Helvetica, Arial, sans-serif
  // TODO hack, not sure why the default style is transparent for material select menu
  background-color: white
  .md-menu-content
    width: initial
    // min-width: 100px
</style>
