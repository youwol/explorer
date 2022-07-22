import { install, LoadingScreenView, Client } from '@youwol/cdn-client'

export {}
require('./style.css')

const loadingScreen = new LoadingScreenView()
loadingScreen.render()

await install({
    modules: [
        'marked#3.x',
        '@youwol/fv-group#0.x',
        '@youwol/fv-button#0.x',
        '@youwol/fv-tree#0.x',
        '@youwol/fv-tabs#0.x',
        '@youwol/fv-input#0.x',
        '@youwol/fv-context-menu#0.x',
        '@youwol/os-core#0.x',
        '@youwol/os-explorer#0.x',
        '@youwol/os-top-banner#0.x',
        '@youwol/os-asset#0.x',
    ],
    css: [
        'bootstrap#4.4.1~bootstrap.min.css',
        'fontawesome#5.12.1~css/all.min.css',
        '@youwol/fv-widgets#latest~dist/assets/styles/style.youwol.css',
    ],
    onEvent: (ev) => {
        loadingScreen.next(ev)
    },
})

Client['initialLoadingScreen'] = loadingScreen

await import('./on-load')
