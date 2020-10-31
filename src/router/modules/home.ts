export default [
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/Login.vue')
    },
    {
        path: '/',
        name: 'Home',
        component: () => import('@/views/Home.vue')
    },
]
