import Vue from 'vue';
import Router from 'vue-router';
import VecViz from '@/VecViz';

Vue.use(Router);

export default new Router({
    routes: [
        {
            path: '/',
            name: 'VecViz',
            component: VecViz,
        },
    ],
});
