import { VirtualDOM } from '@youwol/flux-view'
import { AssetsBackend } from '@youwol/http-clients'
import { Explorer, Assets } from '@youwol/platform-essentials'
import { BehaviorSubject, of } from 'rxjs'
import { LeftNavTab } from './side-nav.view'
import { DockableTabs } from '@youwol/fv-tabs'

export class AssetsView implements VirtualDOM {
    public readonly class = 'h-100 w-100'
    public readonly style = {
        position: 'relative',
    }
    public readonly children: VirtualDOM[]
    public readonly asset: AssetsBackend.GetAssetResponse
    public readonly state: Explorer.ExplorerState

    public readonly leftNavState: DockableTabs.State

    constructor(params: {
        asset: AssetsBackend.GetAssetResponse
        state: Explorer.ExplorerState
    }) {
        Object.assign(this, params)
        this.leftNavState = new DockableTabs.State({
            disposition: 'top',
            viewState$: new BehaviorSubject<DockableTabs.DisplayMode>('pined'),
            tabs$: of([
                new GeneralTab({ state: this.state, asset: this.asset }),
                new PermissionsTab({ state: this.state, asset: this.asset }),
            ]),
            selected$: new BehaviorSubject('Overview'),
            persistTabsView: true,
        })
        let sideNav = new DockableTabs.View({
            state: this.leftNavState,
            styleOptions: {
                initialPanelSize: '400px',
                wrapper: {
                    class: 'h-100 fv-bg-primary',
                },
            },
        })
        this.children = [sideNav]
    }
}

export class GeneralTab extends LeftNavTab {
    constructor(params: {
        state: Explorer.ExplorerState
        asset: AssetsBackend.GetAssetResponse
    }) {
        super({
            id: 'Overview',
            title: 'Overview',
            icon: 'fas fa-home',
            state: params.state,
            content: () => {
                return {
                    class: 'w-100 h-100 fv-text-background',
                    style: {
                        position: 'relative',
                    },
                    children: [
                        new BackgroundView(),
                        new Assets.AssetOverview({
                            asset: {
                                ...params.asset,
                                permissions: { read: true, write: true },
                            } as any,
                            actionsFactory: undefined,
                            assetOutput$: undefined,
                        }),
                    ],
                }
            },
        })
        Object.assign(this, params)
    }
}

export class PermissionsTab extends LeftNavTab {
    constructor(params: {
        state: Explorer.ExplorerState
        asset: AssetsBackend.GetAssetResponse
    }) {
        super({
            id: 'Permissions',
            title: 'Permissions',
            icon: 'fas fa-lock',
            state: params.state,
            content: () => {
                return {
                    class: 'w-100 h-100 fv-text-background',
                    style: {
                        position: 'relative',
                    },
                    children: [
                        new BackgroundView(),
                        new Assets.AssetPermissionsView({
                            asset: params.asset,
                        }),
                    ],
                }
            },
        })
        Object.assign(this, params)
    }
}

export class BackgroundView implements VirtualDOM {
    public readonly children: VirtualDOM[]
    public readonly class = 'fv-bg-primary h-100 w-100'
    public readonly style = {
        zIndex: -1,
        top: '0px',
        left: '0px',
        position: 'absolute',
    }

    constructor() {
        this.children = [
            {
                style: {
                    width: '100%',
                    height: '100%',
                    opacity: 0.75,
                    zIndex: -1,
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'  width='200' height='200' viewBox='0 0 200 200'><rect fill='%23487346' width='200' height='200'/><g fill-opacity='1'><polygon  fill='%234c8e43' points='100 57.1 64 93.1 71.5 100.6 100 72.1'/><polygon  fill='%236aac5f' points='100 57.1 100 72.1 128.6 100.6 136.1 93.1'/><polygon  fill='%234c8e43' points='100 163.2 100 178.2 170.7 107.5 170.8 92.4'/><polygon  fill='%236aac5f' points='100 163.2 29.2 92.5 29.2 107.5 100 178.2'/><path  fill='%2389CC7C' d='M100 21.8L29.2 92.5l70.7 70.7l70.7-70.7L100 21.8z M100 127.9L64.6 92.5L100 57.1l35.4 35.4L100 127.9z'/><polygon  fill='%23768c3a' points='0 157.1 0 172.1 28.6 200.6 36.1 193.1'/><polygon  fill='%2396ac58' points='70.7 200 70.8 192.4 63.2 200'/><polygon  fill='%23B6CC76' points='27.8 200 63.2 200 70.7 192.5 0 121.8 0 157.2 35.3 192.5'/><polygon  fill='%2396ac58' points='200 157.1 164 193.1 171.5 200.6 200 172.1'/><polygon  fill='%23768c3a' points='136.7 200 129.2 192.5 129.2 200'/><polygon  fill='%23B6CC76' points='172.1 200 164.6 192.5 200 157.1 200 157.2 200 121.8 200 121.8 129.2 192.5 136.7 200'/><polygon  fill='%23768c3a' points='129.2 0 129.2 7.5 200 78.2 200 63.2 136.7 0'/><polygon  fill='%23B6CC76' points='200 27.8 200 27.9 172.1 0 136.7 0 200 63.2 200 63.2'/><polygon  fill='%2396ac58' points='63.2 0 0 63.2 0 78.2 70.7 7.5 70.7 0'/><polygon  fill='%23B6CC76' points='0 63.2 63.2 0 27.8 0 0 27.8'/></g></svg>")`,
                },
            },
        ]
    }
}
