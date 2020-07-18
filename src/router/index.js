import Vue from 'vue';
import Router from 'vue-router';
import HelloWorld from '@/HelloWorld';
import VecViz from '@/VecViz';

Vue.use(Router);

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
