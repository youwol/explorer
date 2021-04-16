import { AppState } from './app.state'
import { selectedCardPanel } from './views/asset-presentation-views/panel-asset-presentation.view'
import { createCardsPanel } from './views/panel-assets-list.view'
import { createYouwolBrowserPanel } from './views/panel-browser.view'
import {child$, render} from '@youwol/flux-view'

export class AppView {

    constructor(public readonly state: AppState){}

    render() {

        let panel =render({
            tag: 'div', 
            class: "w-100 h-100 p-1 d-flex",
            children: [
                {
                    class: "d-flex flex-column h-100 ", style: { 'width': '400px', 'min-width': '400px'},
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