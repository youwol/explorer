import { LoadingScreenView, Client } from '@youwol/cdn-client'
import { setup } from '../auto-generated'

import * as cdnClient from '@youwol/cdn-client'

export {}
require('./style.css')

const loadingScreen = new LoadingScreenView()
loadingScreen.render()

await setup.installMainModule({
    cdnClient,
    installParameters: {
        css: [
            'bootstrap#4.4.1~bootstrap.min.css',
            'fontawesome#5.12.1~css/all.min.css',
            '@youwol/fv-widgets#latest~dist/assets/styles/style.youwol.css',
        ],
        onEvent: (ev) => {
            loadingScreen.next(ev)
        },
    },
})

Client['initialLoadingScreen'] = loadingScreen

await import('./on-load')
