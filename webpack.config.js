const path = require('path');
const webpack = require('webpack');
const ROOT = path.resolve(__dirname, 'src/app');
const DESTINATION = path.resolve(__dirname, 'dist');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;


module.exports = {
    context: ROOT,
    mode: 'development',
    entry: {
        'main': './main.ts'
    },
    experiments: {
        topLevelAwait: true
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: "style.[contenthash].css",
            insert: "#css-anchor"
        }),
        new HtmlWebpackPlugin({
            //hash: true,
            title: 'Flux Builder',
            template: './index.html',
            filename: './index.html'
        }),
        new webpack.HotModuleReplacementPlugin(),
        // new BundleAnalyzerPlugin()
    ],
    output: {
        filename: '[name].[contenthash].js',
        path: DESTINATION
    },

    resolve: {
        extensions: ['.ts', '.js'],
        modules: [
            ROOT,
            'node_modules'
        ]
    },
    externals: [{
        "reflect-metadata": "Reflect",
        "lodash": "_",
        "d3": "d3",
        "rxjs": "rxjs",
        "rxjs/operators": "window['rxjs']['operators']",
        "@youwol/flux-core": "window['@youwol/flux-core']",
        "@youwol/flux-view": "window['@youwol/flux-view']",
        '@youwol/fv-group':"window['@youwol/fv-group']",
        '@youwol/fv-tree':"window['@youwol/fv-tree']",
        '@youwol/fv-input':"window['@youwol/fv-input']",
        '@youwol/fv-button':"window['@youwol/fv-button']",    
        '@youwol/fv-tabs':"window['@youwol/fv-tabs']",      
        '@youwol/cdn-client':"window['@youwol/cdn-client']"
    }
    ],
    module: {
        rules: [
            /****************
            * PRE-LOADERS
            *****************/
            {
                enforce: 'pre',
                test: /\.js$/,
                use: 'source-map-loader'
            },
            /****************
            * LOADERS
            *****************/
            {
                test: /\.ts$/,
                exclude: [ /node_modules/ ],
                use: 'ts-loader'
            }, 
            {
                test: /\.css$/i,
                use: [  MiniCssExtractPlugin.loader, 'css-loader' ]
            }
        ]
    },
    devtool: 'cheap-module-source-map',
    devServer: {
        contentBase: path.resolve(__dirname, "./src"),
        historyApiFallback: true,
        inline: true,
        open: false,
        port: 3009,
    }
};



/*const webpack = require("webpack");
const path = require("path");

let config = {
    entry: "./src/index.js",
    output: {
        path: path.resolve(__dirname, "./dist"),
        filename: "./bundle.js"
    },
    plugins: [
    ],
    devServer: {
        contentBase: path.resolve(__dirname, "./dist"),
        historyApiFallback: true,
        inline: true,
        open: false,
        hot: true,
        port:3009,
    },
    module: {
        rules: [
          {
            test: /\.(html|css|png)$/i,
            use: [
              {
                loader: 'file-loader',options: {
                    name: '[name].[ext]',
                  },
              },
            ],
          },
        ],
      },
    //devtool: "eval-source-map"
}

module.exports = config;
*/