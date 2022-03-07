import { install } from '@youwol/cdn-client'

export {}
require('./style.css')

await install(
    {
        modules: [
            'lodash',
            'rxjs',
            '@youwol/flux-core',
            '@youwol/flux-view',
            '@youwol/fv-group',
            '@youwol/fv-button',
            '@youwol/fv-tree',
            '@youwol/fv-tabs',
            '@youwol/fv-input',
            '@youwol/fv-context-menu',
            '@youwol/platform-essentials',
        ],
        css: [
            'bootstrap#4.4.1~bootstrap.min.css',
            'fontawesome#5.12.1~css/all.min.css',
            '@youwol/fv-widgets#latest~dist/assets/styles/style.youwol.css',
        ],
    },
    {
        displayLoadingScreen: true,
    },
)

await import('./on-load')
