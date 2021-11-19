import { AppState } from './app.state'
import { child$, children$, VirtualDOM } from '@youwol/flux-view'
import { YouwolBannerView, defaultUserMenu, defaultYouWolMenu } from "@youwol/flux-youwol-essentials"
import { BehaviorSubject, from } from 'rxjs'
import { map } from 'rxjs/operators'
import { SideBarView } from './views/sidebar/sidebar.view'
import { MainPanelView } from './views/main-panel/main-panel.view'
import { Nodes } from './data'
import { RunningApp } from './views/main-panel/running-app.view'


class RunningAppView implements VirtualDOM {

    public readonly class = 'd-flex w-100 align-items-center fv-bg-background px-2 fv-text-primary fv-pointer border-bottom fv-hover-bg-secondary'

    public readonly children: VirtualDOM[]

    public readonly onclick: () => void
    constructor(app: RunningApp, state: AppState) {
        this.children = [
            {
                class: app.icon
            },
            {
                class: 'mx-1',
                innerText: app.title
            }
        ]
        this.onclick = () => state.run(app)
    }
}

/**
 * Top banner of the application
 */
export class TopBannerView extends YouwolBannerView {

    constructor(state: AppState) {
        super({
            state: state.topBannerState,
            customActionsView: {
                class: 'd-flex flex-wrap',
                children: children$(
                    state.runningApplications$,
                    (applications) => {
                        return applications.map((application) => {
                            return {
                                class: 'd-flex flex-column justify-content-center mx-2',
                                children: [new RunningAppView(application, state)]
                            }
                        })
                    }
                )
            },
            userMenuView: defaultUserMenu(state.topBannerState),
            youwolMenuView: defaultYouWolMenu(state.topBannerState),
            signedIn$: from(
                fetch(new Request("/api/assets-gateway/healthz"))).pipe(
                    map(resp => resp.status == 200)
                )
        })
    }
}

export class AppView implements VirtualDOM {

    class = 'h-100 w-100 d-flex flex-column fv-text-primary'
    state = new AppState()
    children: VirtualDOM[]

    constructor() {

        this.children = [
            new TopBannerView(this.state),
            {
                class: 'flex-grow-1 w-100 d-flex',
                style: { minHeight: '0px' },
                children: [
                    new SideBarView(this.state, new BehaviorSubject(false)),
                    child$(
                        this.state.currentFolder$,
                        ({ folder }: { folder: Nodes.FolderNode }) => new MainPanelView({ state: this.state, folder })
                    )
                ]
            }
        ]
    }
}


