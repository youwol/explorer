import { AppState } from './app.state'
import { selectedCardPanel } from './views/asset-presentation-views/panel-asset-presentation.view'
import { createCardsPanel } from './views/panel-assets-list.view'
import { createYouwolBrowserPanel } from './views/panel-browser.view'
import { child$, render, VirtualDOM } from '@youwol/flux-view'
import { YouwolBannerView, defaultUserMenu, defaultYouWolMenu } from "@youwol/flux-youwol-essentials"
import { BehaviorSubject, from } from 'rxjs'
import { map } from 'rxjs/operators'
import { SideBarView } from './views/sidebar/sidebar.view'
import { MainPanelView } from './views/main-panel/main-panel.view'
import { Nodes } from './data'

/**
 * Top banner of the application
 */
export class TopBannerView extends YouwolBannerView {

    constructor(state: AppState) {
        super({
            state: state.topBannerState,
            customActionsView: {},
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
    children: VirtualDOM[]

    constructor(public readonly state: AppState) {

        this.children = [
            new TopBannerView(state),
            {
                class: 'flex-grow-1 w-100 d-flex',
                style: { minHeight: '0px' },
                children: [
                    new SideBarView(state, new BehaviorSubject(true)),
                    child$(
                        state.currentFolder$,
                        (folder: Nodes.FolderNode) => new MainPanelView({ state, folder })
                    )
                ]
            }
        ]
    }

    render() {

        let panel = render({
            tag: 'div',
            class: "w-100 h-100 p-1 d-flex",
            children: [
                {
                    class: "d-flex flex-column h-100 ", style: { 'width': '400px', 'min-width': '400px' },
                    children: [
                        createYouwolBrowserPanel(this.state)
                    ]
                },
                {
                    class: "d-flex flex-column w-100 h-100 flex-grow-1",
                    children: [
                        createCardsPanel(this.state),
                        child$(
                            this.state.selectedAsset$,
                            selectedAsset => selectedCardPanel(this.state, selectedAsset),
                        )
                    ]
                }
            ]
        })
        document.getElementById("form-content").appendChild(panel)
    }


}


