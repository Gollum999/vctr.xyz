import Vue from 'vue';
import Router from 'vue-router';
import HelloWorld from '@/HelloWorld';
import VecViz from '@/VecViz';

Vue.use(Router);
// TODO: Workaround for bug in vue-material: https://github.com/vuematerial/vue-material/issues/1977
Vue.component('router-link', Vue.options.components.RouterLink);
Vue.component('router-view', Vue.options.components.RouterView);

export default new Router({
    routes: [
        {
            path: '/',
            name: 'HelloWorld',
            component: HelloWorld,
        },
        {
            path: '/vecviz',
            name: 'VecViz',
            component: VecViz,
        },
    ],
});
