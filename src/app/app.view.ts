import { attr$, child$, VirtualDOM } from '@youwol/flux-view'
import { BehaviorSubject, Observable, of } from 'rxjs'
import { Core, Explorer, TopBanner } from '@youwol/platform-essentials'
import { DockableTabs } from '@youwol/fv-tabs'
import { filter, map, mergeMap, shareReplay } from 'rxjs/operators'
import {
    GroupsTab,
    GroupTab,
    LeftNavTab,
    UserDriveTab,
} from './side-nav-left/side-nav-left.view'
import { CdnMessageEvent, Client } from '@youwol/cdn-client'
import { AssetsView } from './assets.view'
import { AssetsGateway, raiseHTTPErrors } from '@youwol/http-clients'
import { SettingsTab } from './side-nav-bottom/side-nav-bottom.view'

/**
 * Top banner of the application
 */
export class TopBannerView extends TopBanner.YouwolBannerView {
    constructor(params: { state: AppState }) {
        super({
            state: params.state.topBannerState,
            customActionsView: new Explorer.HeaderPathView({
                state: params.state,
                class: 'mx-auto w-100 d-flex align-items-center',
            }),
            userMenuView: TopBanner.defaultUserMenu(
                params.state.topBannerState,
            ),
            youwolMenuView: TopBanner.defaultYouWolMenu(
                params.state.topBannerState,
            ),
        })
    }
}

export class AppState extends Explorer.ExplorerState {
    public readonly topBannerState = new TopBanner.YouwolBannerState()

    constructor() {
        super()
        Core.ChildApplicationAPI.setProperties({
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

export type LeftNavTopic = 'MySpace' | 'Groups' | 'Group'

export class AppView implements VirtualDOM {
    class = 'h-100 w-100 d-flex flex-column fv-text-primary'
    state = new AppState()
    children: VirtualDOM[]

    public readonly leftNavState: DockableTabs.State

    public readonly leftNavTabs$: Observable<LeftNavTab[]>

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
        const selectedTabGroup$ = new BehaviorSubject<string>('MySpace')
        const userDriveTab = new UserDriveTab({
            state: this.state,
            selectedTab$: selectedTabGroup$,
        })
        const groupsTab = new GroupsTab({
            state: this.state,
            selectedTab$: selectedTabGroup$,
        })
        let groupTabsCached = {}
        this.leftNavTabs$ = this.state.favoriteGroups$.pipe(
            map((groups) => {
                return [
                    userDriveTab,
                    ...groups.map((group) => {
                        if (!groupTabsCached[group.id]) {
                            groupTabsCached[group.id] = new GroupTab({
                                state: this.state,
                                group,
                                selectedTab$: selectedTabGroup$,
                            })
                        }
                        return groupTabsCached[group.id]
                    }),
                    groupsTab,
                ]
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
        )
        this.leftNavState = new DockableTabs.State({
            disposition: 'left',
            viewState$: new BehaviorSubject<DockableTabs.DisplayMode>('pined'),
            tabs$: this.leftNavTabs$,
            selected$: selectedTabGroup$,
            persistTabsView: true,
        })
        let sideNav = new DockableTabs.View({
            state: this.leftNavState,
        })
        const bottomSideNav = new DockableTabs.View({
            state: new DockableTabs.State({
                disposition: 'bottom',
                viewState$: new BehaviorSubject<DockableTabs.DisplayMode>(
                    'collapsed',
                ),
                tabs$: of([
                    new SettingsTab({
                        state: this.state,
                    }),
                ]),
                selected$: new BehaviorSubject('Settings'),
                persistTabsView: false,
            }),
        })

        this.children = [
            new TopBannerView({ state: this.state }),
            {
                class: 'd-flex position-relative flex-grow-1',
                style: {
                    minHeight: '0px',
                },
                children: [
                    sideNav,
                    {
                        class: 'w-100 h-100 d-flex flex-column',
                        children: [
                            {
                                class: attr$(
                                    this.state.selectedItem$,
                                    (item): string => (item ? 'h-25' : 'h-100'),
                                    { wrapper: (d) => `${d} w-100` },
                                ),
                                children: [
                                    child$(
                                        this.state.openFolder$,
                                        ({ folder }) => {
                                            return new Explorer.FolderContentView(
                                                {
                                                    state: this.state,
                                                    folderId: folder.id,
                                                    groupId: folder.groupId,
                                                },
                                            )
                                        },
                                    ),
                                ],
                            },
                            {
                                class: attr$(
                                    this.state.selectedItem$,
                                    (item): string =>
                                        item ? 'd-block h-75' : 'd-none',
                                ),
                                style: {
                                    boxShadow: 'white 0px 0px 5px',
                                },
                                children: [
                                    child$(
                                        this.state.selectedItem$.pipe(
                                            filter((d) => d != undefined),
                                            mergeMap(
                                                (node: Explorer.AnyItemNode) =>
                                                    new AssetsGateway.AssetsGatewayClient().assets.getAsset$(
                                                        {
                                                            assetId:
                                                                node.assetId,
                                                        },
                                                    ),
                                            ),
                                            raiseHTTPErrors(),
                                        ),
                                        (asset) => {
                                            return new AssetsView({
                                                asset,
                                                state: this.state,
                                            })
                                        },
                                    ),
                                ],
                            },
                        ],
                    },
                ],
            },
            bottomSideNav,
        ]
    }
}
