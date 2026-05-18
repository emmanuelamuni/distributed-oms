const nx = require('@nx/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
    { ignores: ['node_modules', 'dist', '.nx', 'coverage'] },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            '@nx': nx,
        },
        rules: {
            '@typescript-eslint/no-unused-vars': 'error',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    enforceBuildableLibDependencyCheck: true,
                    depConstraints: [
                        { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
                        {
                            sourceTag: 'scope:order',
                            onlyDependOnLibsWithTags: ['scope:shared', 'scope:order'],
                        },
                        {
                            sourceTag: 'scope:inventory',
                            onlyDependOnLibsWithTags: ['scope:shared', 'scope:inventory'],
                        },
                        { sourceTag: 'type:app', onlyDependOnLibsWithTags: ['type:lib'] },
                        { sourceTag: 'type:lib', onlyDependOnLibsWithTags: ['type:lib'] },
                    ],
                },
            ],
        },
    },
];
