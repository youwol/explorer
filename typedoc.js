module.exports = {
    entryPoints: ['./src/app/index.ts'],
    exclude: ['./src/tests'],
    out: 'dist/docs',
    theme: 'default',
    categorizeByGroup: false,
    categoryOrder: [
        'Getting Started',
        'State',
        'View',
        'Configuration',
        'HTTP',
        '*',
    ],
    excludeExternals: true,
    sort: 'source-order',
}
