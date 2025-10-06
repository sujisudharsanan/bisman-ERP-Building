module.exports = {
  plugins: [
    require('postcss-preset-env')({
      stage: 3,
      autoprefixer: { 
        grid: true,
        flexbox: true 
      }
    }),
    require('autoprefixer')({
      overrideBrowserslist: [
        'last 2 versions',
        '> 1%',
        'ie >= 11',
        'iOS >= 10',
        'Safari >= 10'
      ]
    })
  ]
};