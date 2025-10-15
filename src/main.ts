import { createApp } from 'vue'
import App from './App.vue'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      dark: {
        colors: {
          primary: '#004225',
          background: '#005955',
        }
      },
      light: {
        colors: {
          primary: '#004225',
          background: '#005955',
        }
      }
    }
  }
})

const app = createApp(App)
app.use(vuetify)
app.mount('#app')