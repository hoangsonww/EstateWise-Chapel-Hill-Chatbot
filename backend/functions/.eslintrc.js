module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'], // Ensure this points to your tsconfig.json
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn', // Warn instead of error for unused variables
    'no-console': 'off', // Allow console statements
  },
  env: {
    node: true,
    es2020: true,
  },
  overrides: [
    {
      files: ['*.js'], // Exclude JavaScript files
      excludedFiles: '*.js',
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};