// CommonJS PostCSS config for Tailwind v3
module.exports = {
  plugins: [
    // указываем явный конфиг, чтобы не было проблем при загрузке (ESM/CJS)
    require('tailwindcss')('./tailwind.config.cjs'),
    require('autoprefixer'),
  ],
};
