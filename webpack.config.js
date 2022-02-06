const path = require('path')
const mode = process.env.NODE_ENV || 'development'
console.log(`----------------------\nBuilding client in ${mode} mode\n----------------------`)
module.exports = {
    mode,
    entry: './src/app.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'js/bundle.js',
    },
    resolve: {
        extensions: ['.js'],
        fallback: {
            // so ammo.js works: https://doc.babylonjs.com/divingDeeper/developWithBjs/treeShaking#ammo
            'fs': false,
            'path': false,
        },
    },
    devServer: {
      https: true,
      port: 8080,
      static: {
        directory: path.resolve(__dirname, 'public'), //tells webpack to serve from the public folder
      },
    }
}