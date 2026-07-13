/** @type {import('webpack').Configuration} */

const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const TerserPlugin = require('terser-webpack-plugin');
const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const workspaceRoot = path.resolve(__dirname, '..');

// const config = {
//     target: 'node',
//     mode: 'production',
//     entry: path.join(workspaceRoot, 'apps/api/src/main.ts'),
//     output: {
//         path: path.join(workspaceRoot, 'dist/ims'),
//         filename: 'main.js',
//     },
//     module: {
//         rules: [
//             {
//                 test: /\.ts$/,
//                 loader: 'ts-loader',
//                 exclude: /node_modules/,
//                 options: {
//                     configFile: path.join(workspaceRoot, 'apps/api/tsconfig.app.json'),
//                 },
//             },
//         ],
//     },
//     resolve: {
//         extensions: ['.ts', '.js'],
//         plugins: [new TsConfigPathsPlugin({
//             configFile: path.join(workspaceRoot, 'tsconfig.base.json')
//         })]
//     },
//     externals: [nodeExternals()],
// };

const config = {
    target: 'node',
    mode: 'production',
    entry: path.join(workspaceRoot, 'apps/order-capture/src/main.ts'),
    output: {
        path: path.join(workspaceRoot, 'dist/order-capture'),
        filename: 'main.js',
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    keep_classnames: true,
                    keep_fnames: true,
                },
            }),
        ],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
                options: {
                    configFile: path.join(workspaceRoot, 'apps/order-capture/tsconfig.app.json'),
                    transpileOnly: false,
                },
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
        plugins: [
            new TsConfigPathsPlugin({
                configFile: path.join(workspaceRoot, 'tsconfig.base.json'),
            }),
        ],
    },
    externals: [nodeExternals()],
};

webpack(config, (err, stats) => {
    if (err) {
        console.error('FATAL ERROR:', err);
        process.exit(1);
    }

    const info = stats.toJson();

    if (stats.hasErrors()) {
        console.error('COMPILATION ERRORS:', info.errors);
        process.exit(1);
    }

    console.log('Successfully built order-capture app');
});
