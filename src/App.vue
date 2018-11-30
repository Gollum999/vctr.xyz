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

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
  height: 100%;
}

.container #app {
    min-height: 100vh;
    /* max-height: 100vh; */
}
</style>
