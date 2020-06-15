// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue';
import VueSplit from 'vue-split-panel';
import App from './App.vue';
import router from './router';
import * as VueGL from 'vue-gl';
import vuetify from './plugins/vuetify';
import VueResize from 'vue-resize';

import 'roboto-fontface/css/roboto/roboto-fontface.css';
import '@mdi/font/css/materialdesignicons.css';
import 'vue-resize/dist/vue-resize.css';
import '../static/global.css';

Vue.config.productionTip = false;
Vue.use(VueSplit);
Vue.use(VueResize);

console.log('Initializing VueGL components');
Object.keys(VueGL).forEach(name => {
    Vue.component(name, (VueGL as any)[name]);
});

/* eslint-disable no-new */
new Vue({
    el: '#app',
    router,
    components: { App },
    vuetify,
    template: '<App/>',
});
/*
 * // TODO maybe keep this in debug only
 * Vue.config.errorHandler = (err, vm, info) => {
 *     console.error('Error caught in global error handler');
 *     console.error((err, vm, info));
 * };
 */
