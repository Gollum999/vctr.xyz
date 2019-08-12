import Vue from 'vue';
import Router from 'vue-router';
import HelloWorld from '@/HelloWorld';
import VecViz from '@/VecViz';
// import SettingsModal from '@/SettingsModal';

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
            // children: [{
            //     path: 'settings',
            //     name: 'settings',
            //     components: {
            //         modal: SettingsModal,
            //     },
            // }],
        },
    ],
});

// import Home from './views/Home.vue'

// Vue.use(Router)

// export default new Router({
//   mode: 'history',
//   base: process.env.BASE_URL,
//   routes: [
//     {
//       path: '/',
//       name: 'home',
//       component: Home
//     },
//     {
//       path: '/about',
//       name: 'about',
//       // route level code-splitting
//       // this generates a separate chunk (about.[hash].js) for this route
//       // which is lazy-loaded when the route is visited.
//       component: () => import(/* webpackChunkName: "about" */ './views/About.vue')
//     }
//   ]
// })
