// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue';
import BootstrapVue from 'bootstrap-vue';
import VueSplit from 'vue-split-panel';
import App from './App';
import router from './router';
import * as VueGL from 'vue-gl';
import VueMaterial from 'vue-material';

import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';
import 'vue-material/dist/vue-material.min.css';
import 'vue-material/dist/theme/default.css';

Vue.config.productionTip = false;
Vue.use(BootstrapVue);
Vue.use(VueSplit);
Vue.use(VueMaterial);

console.log('Initializing VueGL components');
Object.keys(VueGL).forEach(name => {
    Vue.component(name, VueGL[name]);
});

/* eslint-disable no-new */
new Vue({
    el: '#app',
    router,
    components: { App },
    template: '<App/>',
});

// TODO maybe keep this in debug only
Vue.config.errorHandler = (err, vm, info) => {
    console.error('Error caught in global error handler');
    console.error((err, vm, info));
};
