// eslint.config.js — ESLint 9 (flat config) для Vite + React + TypeScript
import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import importX from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

const TS_FILES = ['**/*.{ts,tsx}'];

// Все запреты синтаксиса собраны в одно правило: no-restricted-syntax
// не «склеивается» между блоками конфига — последний блок перезаписывает предыдущий.
const restrictedSyntax = [
  // Запрет классов
  { selector: 'ClassDeclaration', message: 'Классы запрещены. Используйте функции и объекты.' },
  { selector: 'ClassExpression', message: 'Классы запрещены. Используйте функции и объекты.' },
  // Только стрелочные функции
  {
    selector: 'FunctionDeclaration',
    message: 'Используйте стрелочную функцию: const fn = () => {}.',
  },
  {
    selector: 'FunctionExpression',
    message: 'Используйте стрелочную функцию (в т.ч. вместо методов объекта { foo() {} }).',
  },
  // Запрет optional chaining: obj?.prop, obj?.[key], fn?.()
  {
    selector: 'ChainExpression',
    message: 'Optional chaining (?.) запрещён. Сделайте явную проверку на null / undefined.',
  },
];

export default defineConfig([
  // 1. Игноры (глобальные). Всё, что не .ts/.tsx, не проверяем.
  globalIgnores([
    'dist/**',
    'build/**',
    'node_modules/**',
    '**/*.{js,jsx,mjs,cjs}',
  ]),

  // 2. Базовые рекомендуемые наборы — только для ts/tsx
  {
    files: TS_FILES,
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: {
        // Type-aware линтинг (нужен для strict-boolean-expressions и no-unsafe-*)
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: { version: 'detect' },
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ alwaysTryTypes: true }),
      ],
    },
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      // --- any ---
      '@typescript-eslint/no-explicit-any': 'error',

      // --- неиспользуемые переменные и импорты ---
      // Базовые правила выключаем, чтобы не было дублей: их заменяет unused-imports
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          ignoreRestSiblings: true,
        },
      ],

      // --- тернарники: максимум один уровень ---
      'no-nested-ternary': 'error',

      // --- классы, стрелочные функции, optional chaining ---
      'no-restricted-syntax': ['error', ...restrictedSyntax],
      'prefer-arrow-callback': 'error',

      // --- явные сравнения с null / undefined ---
      eqeqeq: ['error', 'always'], // запрещает и `x == null`
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: false,
          allowNullableBoolean: false,
          allowNullableString: false,
          allowNullableNumber: false,
          allowNullableEnum: false,
          allowAny: false,
        },
      ],

      // --- console ---
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // --- React ---
      'react/prop-types': 'off', // типы пропсов проверяет TypeScript
    },
  },

  // 3. Изоляция слоёв
  //    app    — может импортировать всё (ограничений нет)
  //    shared — не может импортировать из app, pages, widgets, features, entities
  //    прочие — без ограничений
  {
    files: TS_FILES,
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/shared',
              from: [
                './src/app',
                './src/pages',
                './src/widgets',
                './src/features',
                './src/entities',
              ],
              message: 'Слой shared не может зависеть от вышележащих слоёв.',
            },
          ],
        },
      ],
    },
  },
]);