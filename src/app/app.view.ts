import { child$, VirtualDOM } from '@youwol/flux-view'
import { BehaviorSubject } from 'rxjs'
import { Core, Explorer, TopBanner } from '@youwol/platform-essentials'
import { DockableTabs } from '@youwol/fv-tabs'
import { mergeMap } from 'rxjs/operators'
import { GroupsTab, LeftNavTab, UserDriveTab } from './side-nav.view'
import { ContextMenuState } from './context-menu.view'
import { ContextMenu } from '@youwol/fv-context-menu'

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

export type LeftNavTopic = 'MySpace' | 'Groups'

export class AppView implements VirtualDOM {
    class = 'h-100 w-100 d-flex flex-column fv-text-primary'
    state = new AppState()
    children: VirtualDOM[]

    public readonly leftNavState: DockableTabs.State

    public readonly leftNavTabs: Record<LeftNavTopic, LeftNavTab>

    constructor() {
        this.leftNavTabs = {
            MySpace: new UserDriveTab({
                state: this.state,
            }),
            Groups: new GroupsTab({
                state: this.state,
            }),
        }
        this.leftNavState = new DockableTabs.State({
            disposition: 'left',
            viewState$: new BehaviorSubject<DockableTabs.DisplayMode>('pined'),
            tabs$: new BehaviorSubject(Object.values(this.leftNavTabs)),
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
                                    connectedCallback: (elem) => {
                                        return new ContextMenu.View({
                                            state: new ContextMenuState({
                                                appState: this.state,
                                                div: elem,
                                                item$: this.state.selectedItem$,
                                            }),
                                            class: 'fv-bg-background border fv-color-primary fv-text-primary',
                                            style: {
                                                zIndex: 20,
                                            },
                                        } as any)
                                    },
                                })
                            }),
                        ],
                    },
                ],
            },
        ]
    }
}
