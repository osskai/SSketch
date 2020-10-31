import Vue from 'vue'
import VueRouter from 'vue-router'
import ConfigRouters from "@/router/modules";
import Common from './common';
import {getToken} from "@/utils/common";

Vue.use(VueRouter);

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    scrollBehavior() {
        return {x: 0, y: 0}
    },
    routes: ConfigRouters.concat(Common)
});

const LOGIN_PAGE_NAME: string = 'Login';
router.beforeEach((to, from, next) => {
    const token = getToken();
    if (!token && to.name !== LOGIN_PAGE_NAME) {
        next({
            name: LOGIN_PAGE_NAME
        })
    } else if (!token && to.name === LOGIN_PAGE_NAME) {
        next()
    } else if (token && to.name === LOGIN_PAGE_NAME) {
        next({
            name: 'Home'
        })
    } else {
        if (token) {
            next()
        } else {
            next({
                name: LOGIN_PAGE_NAME
            })
        }
    }
});

router.afterEach(() => {

});

export default router
