import { child$, VirtualDOM, attr$ } from '@youwol/flux-view'
import * as OsCore from '@youwol/os-core'
import * as OsExplorer from '@youwol/os-explorer'
import * as OsBanner from '@youwol/os-top-banner'
import * as OsAsset from '@youwol/os-asset'
import { filter, map, mergeMap } from 'rxjs/operators'
import { CdnMessageEvent, Client } from '@youwol/cdn-client'
import { combineLatest } from 'rxjs'
/**
 * Top banner of the application
 */
export class TopBannerView extends OsBanner.TopBannerView {
    constructor(params: { state: AppState }) {
        super({
            innerView: new OsExplorer.HeaderPathView({
                state: params.state,
                class: 'mx-auto w-100 d-flex align-items-center',
            }),
        })
    }
}

export class AppState extends OsExplorer.ExplorerState {
    constructor() {
        super()
        OsCore.ChildApplicationAPI.setProperties({
            snippet: {
                class: 'd-flex align-items-center px-1',
                children: [
                    {
                        class: 'fas fa-user mr-1',
                    },
                    child$(
                        this.openFolder$.pipe(
                            mergeMap(({ tree }) => tree.root$),
                        ),
                        (root) => ({ innerText: root.name }),
                    ),
                    {
                        class: 'fas fa-folder mx-1',
                    },
                    child$(this.openFolder$, ({ folder }) => ({
                        innerText: folder.name,
                    })),
                ],
            },
        })
    }
}

export class AppView implements VirtualDOM {
    class = 'h-100 w-100 d-flex flex-column fv-text-primary'
    state = new AppState()
    children: VirtualDOM[]

    constructor() {
        const loadingScreen = Client['initialLoadingScreen']
        loadingScreen.next(
            new CdnMessageEvent('fetch_user_info', 'Fetch user info...'),
        )
        this.state.userInfo$.subscribe(() => {
            loadingScreen.next(
                new CdnMessageEvent(
                    'fetch_user_info',
                    'Fetch user info...done',
                ),
            )
        })
        this.state.defaultUserDrive$.subscribe(() =>
            Client['initialLoadingScreen'].done(),
        )
        this.children = [
            new TopBannerView({ state: this.state }),
            {
                class: 'd-flex position-relative flex-grow-1',
                style: {
                    minHeight: '0px',
                },
                children: [
                    new OsExplorer.SideNav.SideNavView({
                        state: this.state,
                    }),
                    new MainPanelView({
                        state: this.state,
                    }),
                ],
            },
        ]
    }
}

export class MainPanelView implements VirtualDOM {
    static ClassSelector = 'main-panel-view'
    public readonly class = `${MainPanelView.ClassSelector} w-100 h-100 d-flex`
    public readonly style = {
        minHeight: '0px',
    }
    public readonly children: VirtualDOM[]

    public readonly state: OsExplorer.ExplorerState

    constructor(params: { state: OsExplorer.ExplorerState }) {
        Object.assign(this, params)

        this.children = [
            {
                class: attr$(
                    this.state.selectedItem$,
                    (item): string => (item ? 'w-25' : 'w-50'),
                    { wrapper: (d) => `${d} h-100` },
                ),
                style: {
                    minWidth: '250px',
                    maxWidth: '400px',
                },
                children: [
                    child$(this.state.openFolder$, ({ folder }) => {
                        return new OsExplorer.FolderContentView({
                            state: this.state,
                            folderId: folder.id,
                            groupId: folder.groupId,
                        })
                    }),
                ],
            },
            {
                class: attr$(this.state.selectedItem$, (item): string =>
                    item ? 'd-block flex-grow-1' : 'd-none',
                ),
                style: {
                    boxShadow: 'white 0px 0px 5px',
                },
                children: [
                    child$(
                        this.state.selectedItem$.pipe(
                            filter((d) => d != undefined),
                            mergeMap((node: OsExplorer.ItemNode) =>
                                combineLatest([
                                    OsCore.RequestsExecutor.getAsset(
                                        node.assetId,
                                    ),
                                    OsCore.RequestsExecutor.getPermissions(
                                        node.assetId,
                                    ).pipe(
                                        map((resp) => {
                                            if (
                                                !node.origin ||
                                                node.origin.local
                                            ) {
                                                return resp
                                            }
                                            return {
                                                ...resp,
                                                write: false,
                                            }
                                        }),
                                    ),
                                ]),
                            ),
                        ),
                        ([asset, permissions]) => {
                            return new OsAsset.AssetView({
                                asset,
                                permissions,
                            })
                        },
                    ),
                ],
            },
        ]
    }
}
