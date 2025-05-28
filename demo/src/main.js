// main.js
import { createApp } from 'vue'
import App from './App.vue'
import fileDrop from './lib/fileDrop.js'
import loadDroppedGraph from './lib/loadDroppedGraph.js'

const app = createApp(App)
app.mount('#app')

// When they drop a `.dot` file into the browser - let's load it.
fileDrop(document.body, loadDroppedGraph)