import 'reflect-metadata';

import 'bulma/css/bulma.css';
import './main.css';
import { createApp } from 'vue';
import App from './App';
import router from './router';


createApp(App).use(router).mount('#app');
