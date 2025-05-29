// vue.config.js
const { defineConfig } = require('@vue/cli-service')
const webpack = require('webpack')

module.exports = defineConfig({
  lintOnSave: false, // Disable ESLint for now
  publicPath: process.env.NODE_ENV === 'production' 
    ? '/graph-layout-demo/' 
    : '/',
  
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: true,
        __VUE_PROD_DEVTOOLS__: false,
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
      })
    ]
  },

  // Fix Content Security Policy for development
  devServer: {
    headers: {
      'Content-Security-Policy': "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
    }
  }
})