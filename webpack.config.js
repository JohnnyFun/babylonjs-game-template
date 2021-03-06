const path = require('path')
const fs = require('fs')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const appDirectory = fs.realpathSync(process.cwd())
const mode = process.env.NODE_ENV || 'development'
console.log(`----------------------\nBuilding client in ${mode} mode\n----------------------`)
module.exports = {
    mode,
    entry: path.resolve(appDirectory, 'src/app.js'), //path to the main .ts file
    output: {
        filename: 'js/bundle.js', //name for the javascript file that is created/compiled in memory
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
      host: '0.0.0.0',
      port: 8080,
      disableHostCheck: true,
      contentBase: path.resolve(appDirectory, 'public'), //tells webpack to serve from the public folder
      publicPath: '/',
      hot: true,
    },
    module: {
        rules: [
        ],
    },
    plugins: [
      new HtmlWebpackPlugin({
          inject: true, // will inject the script tag
          template: path.resolve(appDirectory, "public/index.html"),
      }),
      new CleanWebpackPlugin(),
    ],
}