module.exports = {
  root: true,
  env: {
    browser: true,
    node: true
  },
  'extends': [
    'plugin:vue/essential',
    '@vue/standard',
    '@vue/typescript'
  ],
  parserOptions: {
    parser: '@typescript-eslint/parser'
  },
  // // required to lint *.vue files
  // plugins: [
  //   'vue'
  // ],
  // add your custom rules here
  rules: {
    // allow async-await
    'generator-star-spacing': 'off',
    // allow debugger/logging during development
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'comma-dangle': ['error', 'always-multiline'],
    'space-before-function-paren': ['error', {
      'anonymous': 'always',
      'named': 'never',
      'asyncArrow': 'always',
    }],
    'semi': ['error', 'always'], // require semicolons
    'indent': ['error', 4], // 4 space indentation
    'key-spacing': ['error', {'mode': 'minimum'}], // Allow extra spaces in object to align values
    'no-multi-spaces': ['error', { exceptions: { 'Property': true, 'ObjectExpression': true, 'SwitchCase': true, } }],
    'standard/object-curly-even-spacing': 'off', // Allow inconsistent spacing in object literals for alignment
    'object-curly-spacing': 'off',
  }
}
