// This is a workaround for https://github.com/eslint/eslint/issues/3458
require('@rushstack/eslint-config/patch/modern-module-resolution');

module.exports = {
  extends: ['@rushstack/eslint-config/profile/node'],
  parserOptions: { tsconfigRootDir: __dirname },
  rules: {
    '@typescript-eslint/member-ordering': 'off',
    '@typescript-eslint/naming-convention': 'off',
    '@typescript-eslint/explicit-member-accessibility': 'off',
    '@rushstack/typedef-var': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/parameter-properties': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/typedef': 'off',
    '@typescript-eslint/consistent-type-definitions': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@rushstack/no-new-null': 'off'
  }
};
