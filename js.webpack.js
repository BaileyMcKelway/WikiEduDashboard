const path = require('path');
const config = require('./config');
const ManifestPlugin = require('webpack-manifest-plugin');
const LodashModuleReplacementPlugin = require('lodash-webpack-plugin');
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');
const webpack = require('webpack');

const jsSource = `./${config.sourcePath}/${config.jsDirectory}`;
const appRoot = path.resolve('./');
const entry = {
  main: [`${jsSource}/main.js`],
  sentry: [`${jsSource}/sentry.js`],
  styleguide: [`${jsSource}/styleguide/styleguide.jsx`],
  survey: [`${jsSource}/surveys/survey.js`],
  survey_admin: [`${jsSource}/surveys/survey-admin.js`],
  survey_results: [`${jsSource}/surveys/survey-results.jsx`],
  campaigns: [`${jsSource}/campaigns.js`],
  charts: [`${jsSource}/charts.js`],
  tinymce: [`${jsSource}/tinymce.js`],
  embed_course_stats: [`${jsSource}/embed_course_stats.js`],
  faq: [`${jsSource}/faq.js`]
};

module.exports = (env) => {
  const doHot = env.development && !env.watch_js;
  const mode = env.development ? 'development' : 'production';
  const outputPath = doHot
    ? path.resolve(appRoot, `${config.outputPath}/${config.jsDirectory}`)
    : path.resolve(`${config.outputPath}/${config.jsDirectory}`);

  return {
    mode,
    entry,
    output: {
      path: outputPath,
      filename: doHot ? '[name].js' : '[name].[chunkhash].js',
      publicPath: '/assets/javascripts/',
    },
    resolve: {
      extensions: ['.js', '.jsx'],
      symlinks: false
    },
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: [/vendor/, /node_modules(?!\/striptags)/],
          use: {
            loader: 'babel-loader',
            query: {
              cacheDirectory: true,
            },
          },
        },
        {
          test: /\.jsx?$/,
          exclude: [/vendor/, /node_modules(?!\/striptags)/],
          loader: 'eslint-loader',
          options: {
            cache: true,
            failOnError: !!env.production
          },
        },
      ],
    },
    externals: {
      jquery: 'jQuery',
      'i18n-js': 'I18n'
    },
    plugins: [
      // manifest file
      new ManifestPlugin({
        fileName: 'js-manifest.json'
      }),
      // node environment
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(mode),
        },
      }),
      // Creates smaller Lodash builds by replacing feature sets of modules with noop,
      // identity, or simpler alternatives.
      new LodashModuleReplacementPlugin(config.requiredLodashFeatures),
      new MomentLocalesPlugin()
    ],
    optimization: {
      splitChunks: {
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/]((?!(chart)).*)[\\/]/,
            chunks: chunk => !/tinymce/.test(chunk.name),
            name: 'vendors'
          }
        }
      },
    },
    watch: env.watch_js,
    devtool: env.development ? 'eval' : 'source-map',
    stats: env.stats ? 'normal' : 'minimal',
  };
};

