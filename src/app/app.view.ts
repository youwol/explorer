import { child$, VirtualDOM } from '@youwol/flux-view'
import { BehaviorSubject } from 'rxjs'
import {
    SideBarView, YouwolBannerState,
    YouwolBannerView, defaultUserMenu, defaultYouWolMenu, HeaderPathView, DisplayMode,
    FolderContentView, ExplorerState
} from '@youwol/platform-essentials'


/**
 * Top banner of the application
 */
export class TopBannerView extends YouwolBannerView {

    constructor(params: { state: AppState }) {
        super({
            state: params.state.topBannerState,
            customActionsView: new HeaderPathView({ state: params.state, class: 'mx-auto w-100 fv-bg-background d-flex align-items-center' } as any),
            userMenuView: defaultUserMenu(params.state.topBannerState),
            youwolMenuView: defaultYouWolMenu(params.state.topBannerState)
        })
    }
}

export class AppState extends ExplorerState {

    public readonly displayMode$ = new BehaviorSubject<DisplayMode>('details')
    public readonly topBannerState = new YouwolBannerState()

    constructor() {
        super()
    }
}

export class AppView implements VirtualDOM {

    class = 'h-100 w-100 d-flex flex-column fv-text-primary'
    state = new AppState()
    children: VirtualDOM[]

    constructor() {

        this.children = [
            new TopBannerView({ state: this.state }),
            {
                class: 'flex-grow-1 w-100 d-flex',
                style: { minHeight: '0px' },
                children: [
                    new SideBarView(this.state, new BehaviorSubject(false)),
                    {
                        class: 'w-100 h-100 d-flex',
                        children: [
                            child$(
                                this.state.currentFolder$,
                                ({ folder }) => {
                                    return new FolderContentView({
                                        state: this.state,
                                        folderId: folder.id,
                                        groupId: folder.groupId
                                    })
                                }
                            )
                        ]
                    }
                ]
            }
        ]
    }
}


