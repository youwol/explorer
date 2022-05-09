import { child$, VirtualDOM } from '@youwol/flux-view'
import { BehaviorSubject, Observable } from 'rxjs'
import { Core, Explorer, TopBanner } from '@youwol/platform-essentials'
import { DockableTabs } from '@youwol/fv-tabs'
import { map, mergeMap } from 'rxjs/operators'
import { GroupsTab, GroupTab, LeftNavTab, UserDriveTab } from './side-nav.view'
import { CdnMessageEvent, Client } from '@youwol/cdn-client'

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
                    new UserDriveTab({ state: this.state }),
                    ...groups.map((group) => {
                        return new GroupTab({ state: this.state, group })
                    }),
                    new GroupsTab({ state: this.state }),
                ]
            }),
        )
        this.leftNavState = new DockableTabs.State({
            disposition: 'left',
            viewState$: new BehaviorSubject<DockableTabs.DisplayMode>('pined'),
            tabs$: this.leftNavTabs$,
            selected$: new BehaviorSubject<LeftNavTopic>('MySpace'),
            persistTabsView: true,
        })
        let sideNav = new DockableTabs.View({
            state: this.leftNavState,
            styleOptions: { initialPanelSize: '300px' },
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
                        class: 'w-100 h-100 d-flex',
                        children: [
                            child$(this.state.openFolder$, ({ folder }) => {
                                return new Explorer.FolderContentView({
                                    state: this.state,
                                    folderId: folder.id,
                                    groupId: folder.groupId,
                                })
                            }),
                        ],
                    },
                ],
            },
        ]
    }
}
