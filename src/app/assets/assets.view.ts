import { child$, VirtualDOM } from '@youwol/flux-view'
import { AssetsBackend, AssetsGateway } from '@youwol/http-clients'
import { Explorer, Assets } from '@youwol/platform-essentials'
import { BehaviorSubject, from } from 'rxjs'
import { LeftNavTab } from '../side-nav-left/side-nav-left.view'
import { DockableTabs } from '@youwol/fv-tabs'
import { map, mergeMap } from 'rxjs/operators'
import * as cdnClient from '@youwol/cdn-client'
import * as fluxView from '@youwol/flux-view'

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
        let tabs$ = this.state.explorerSettings$.pipe(
            mergeMap(
                (
                    explorerSettings: () => Promise<Explorer.ExplorerSettings>,
                ) => {
                    return from(explorerSettings())
                },
            ),
            map(({ assetPreviews }) => {
                return assetPreviews({
                    asset: this.asset,
                    cdnClient,
                    fluxView,
                    assetsGtwClient: new AssetsGateway.AssetsGatewayClient(),
                }).filter((preview) => preview.applicable())
            }),
            map((previews) => {
                return [
                    new GeneralTab({ state: this.state, asset: this.asset }),
                    new PermissionsTab({
                        state: this.state,
                        asset: this.asset,
                    }),
                    ...previews.map(
                        (preview) =>
                            new CustomTab({
                                state: this.state,
                                asset: this.asset,
                                preview: preview.exe(),
                                name: preview.name,
                                icon: preview.icon,
                            }),
                    ),
                ]
            }),
        )
        this.leftNavState = new DockableTabs.State({
            disposition: 'top',
            viewState$: new BehaviorSubject<DockableTabs.DisplayMode>('pined'),
            tabs$,
            selected$: new BehaviorSubject('Overview'),
            persistTabsView: false,
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

function getBackgroundChild$(
    asset: AssetsBackend.GetAssetResponse,
    state: Explorer.ExplorerState,
) {
    return child$(Explorer.defaultOpeningApp$(state, asset), (defaultAsset) => {
        return defaultAsset ? defaultAsset.background : {}
    })
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
                    class: 'w-100 h-100 fv-bg-background fv-xx-lighter',
                    style: {
                        position: 'relative',
                    },
                    children: [
                        getBackgroundChild$(params.asset, params.state),
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
                    class: 'w-100 h-100 fv-bg-background fv-xx-lighter',
                    style: {
                        position: 'relative',
                    },
                    children: [
                        getBackgroundChild$(params.asset, params.state),
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

export class CustomTab extends LeftNavTab {
    constructor(params: {
        state: Explorer.ExplorerState
        asset: AssetsBackend.GetAssetResponse
        name: string
        preview: VirtualDOM
        icon: string
    }) {
        super({
            id: params.name,
            title: params.name,
            icon: params.icon,
            state: params.state,
            content: () => {
                return params.preview
            },
        })
        Object.assign(this, params)
    }
}
