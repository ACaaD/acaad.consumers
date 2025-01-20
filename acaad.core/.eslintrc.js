require('./node_modules/acaad.toolchain/.eslintrc.js');

module.exports = {
  extends: ['./node_modules/acaad.toolchain/.eslintrc.js'],
  parserOptions: { tsconfigRootDir: __dirname },
  ignorePatterns: ['node_modules/', '**/node_modules/', '/**/node_modules/*', 'out/', 'dist/', 'build/']
};
