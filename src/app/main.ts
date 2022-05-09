import { install, LoadingScreenView, Client } from '@youwol/cdn-client'

export {}
require('./style.css')

const loadingScreen = new LoadingScreenView()
loadingScreen.render()

await install(
    {
        modules: [
            'lodash',
            'rxjs',
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
        onEvent: (ev) => {
            loadingScreen.next(ev)
        },
    },
)

Client['initialLoadingScreen'] = loadingScreen

await import('./on-load')
