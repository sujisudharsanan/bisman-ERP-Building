module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      overrideBrowserslist: [
        '> 1%',
        'last 2 versions',
        'not dead',
        'iOS >= 10',
        'Safari >= 10',
      ],
    },
    'postcss-preset-env': {
      stage: 3,
      features: {
        'custom-properties': false,
      },
    },
  },
};
