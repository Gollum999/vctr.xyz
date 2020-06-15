import Vue from 'vue'
import vuetify from './plugins/vuetify'

declare module 'vue/types/options' {
  interface ComponentOptions<V extends Vue> {
    vuetify?: typeof vuetify
  }
}
