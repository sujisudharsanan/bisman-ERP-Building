const path = require('path');

module.exports = {
    entry: './webapp/index.js',
    output: {
        path: path.resolve(__dirname, 'webapp/dist'),
        filename: 'main.js',
        libraryTarget: 'window',
        library: 'Plugin',
    },
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
        ],
    },
    resolve: {
        extensions: ['.js'],
    },
};
