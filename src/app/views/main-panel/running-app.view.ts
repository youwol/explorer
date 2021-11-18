import { child$, VirtualDOM } from "@youwol/flux-view";
import { AppState } from "../../app.state";
import { Nodes } from "../../data";


export interface RunningApp {
    title: string
    icon: string
    headerView: VirtualDOM
    contentView: VirtualDOM
    item: Nodes.ItemNode
}


export class HeaderRunningApp implements VirtualDOM {

    public readonly class = "w-100 d-flex p-2 fv-bg-background-alt justify-content-center align-items-center"
    public readonly children: VirtualDOM[]
    public readonly state: AppState
    style = {
        height: '50px'
    }
    constructor(params: { state: AppState }) {
        Object.assign(this, params)

        this.children = [
            child$(this.state.viewMode$, (d) => d == 'navigation'
                ? {}
                : this.content(d)
            )
        ]
    }

    content(preview: RunningApp) {
        return {
            class: 'd-flex h-100',
            children: [
                preview.headerView,
                {
                    class: 'fas fa-times my-auto fv-pointer fv-hover-text-secondary mx-2',
                    onclick: () => this.state.close(preview)
                },
                {
                    class: 'fas fa-window-minimize my-auto fv-pointer fv-hover-text-secondary mx-2 ',
                    onclick: () => {
                        this.state.persistApplication(preview)
                        this.state.toggleNavigationMode()
                    }
                }
            ]
        }
    }
}
