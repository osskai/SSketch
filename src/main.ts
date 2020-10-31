import Vue from 'vue';
import App from './App.vue';
import './registerServiceWorker';
import router from './router';
import store from './store';

import Toast from "vue-toastification";

import 'font-awesome/css/font-awesome.min.css';
import "vue-toastification/dist/index.css";

Vue.config.productionTip = false;

const options = {
    position: "top-right",
    timeout: 3000,
    pauseOnHover: true,
    closeButton: false,
    icon: true
};
Vue.use(Toast, options);

new Vue({
    router,
    store,
    render: h => h(App)
}).$mount('#app');
