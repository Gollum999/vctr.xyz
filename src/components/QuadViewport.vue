<template>
  <div class="quad-viewport">
    <div class="flex-row">
      <div class="viewport-container">
        a
      </div>
      <div class="viewport-container">
        b
      </div>
    </div>
    <div class="flex-row">
      <div class="viewport-container">
        c
      </div>
      <div class="viewport-container">
        d
      </div>
    </div>
  </div>
</template>

<script>
</script>

<style>
.quad-viewport {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
}
.flex-row {
    display: flex;
    flex-direction: row;
    height: 50%;
}
.viewport-container {
    border: 2px solid #dddddd;
    width: 100%;
}
</style>
