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
        this.onclick = () => state.focus(app)
    }
}

/**
 * Regular top banner of the application (no application running)
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


/**
 * Top banner when an application is running
 */
export class RunningAppTopBannerView extends YouwolBannerView {

    constructor(state: AppState, app: RunningApp) {

        let baseClass = 'fas my-auto fv-pointer fv-hover-text-secondary mx-2'
        super({
            state: state.topBannerState,
            customActionsView: {
                class: 'my-auto d-flex justify-content-between w-100',
                children: [
                    {
                        class: 'd-flex flex-align-center',
                        children: [
                            {
                                class: 'border-bottom px-2 mx-3 fv-text-focus',
                                style: {
                                    fontFamily: 'serif',
                                    fontSize: 'x-large'
                                },
                                innerText: app.title
                            },
                            {
                                class: 'd-flex flex-column align-items-center',
                                children: [
                                    {
                                        class: `${baseClass} fa-times`,
                                        onclick: () => state.close(app),
                                    },
                                    {
                                        class: `${baseClass} fa-window-minimize`,
                                        onclick: () => state.minimize(app),
                                    }
                                ]
                            }]
                    },
                    {
                        class: 'flex-grow-1 my-auto',
                        children: [
                            child$(
                                app.topBannerActions$,
                                (vDOM) => {
                                    console.log("Insert to-banner custom actions", vDOM)
                                    return vDOM
                                }
                            )
                        ]
                    }
                ]
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
            child$(
                this.state.runningApplication$,
                (app) => app == undefined ? new TopBannerView(this.state) : new RunningAppTopBannerView(this.state, app)
            ),
            {
                class: 'flex-grow-1 w-100 d-flex',
                style: { minHeight: '0px' },
                children: [
                    new SideBarView(this.state, new BehaviorSubject(false)),
                    new MainPanelView({ state: this.state })
                ]
            }
        ]
    }
}


