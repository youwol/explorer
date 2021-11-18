import { attr$, child$, children$, Stream$, VirtualDOM } from "@youwol/flux-view";
import { BehaviorSubject } from "rxjs";
import { distinctUntilChanged, filter } from "rxjs/operators";
import { AppState, SelectedItem } from "../../app.state";
import { Nodes } from "../../data";
import { ActionsView } from "./actions.view";
import { FolderContentView } from "./folder-content/folder-content.view";
import { HeaderPathView } from "./header-path.view";
import { HeaderRunningApp, RunningApp } from "./running-app.view";


export type DisplayMode = "cards" | "miniatures" | "details"


export class MainPanelView implements VirtualDOM {

    public readonly class = "w-100 h-100 flex-grow-1 d-flex flex-column"
    public readonly style = {
        minHeight: '0px'
    }
    public readonly children: VirtualDOM[]

    public readonly state: AppState
    public readonly folder: Nodes.FolderNode

    public readonly displayMode$ = new BehaviorSubject<DisplayMode>('details')

    constructor(params: { state: AppState, folder: Nodes.FolderNode }) {
        Object.assign(this, params)

        console.log("MainPanelView")
        this.children = [
            {
                class: attr$(this.state.viewMode$,
                    (mode) => mode == 'navigation' ? 'w-100 d-flex' : 'd-none'
                ),
                children: [
                    new HeaderPathView({ state: this.state, displayMode$: this.displayMode$ }),
                ]
            },
            {
                class: attr$(this.state.viewMode$,
                    (mode) => mode == 'navigation' ? 'd-none' : 'w-100 d-flex'
                ),
                children: [
                    new HeaderRunningApp({ state: this.state })
                ]
            },
            {
                class: 'flex-grow-1',
                style: { minHeight: '0px' },
                children: [
                    {
                        class: attr$(this.state.viewMode$,
                            (mode) => mode == 'navigation' ? 'h-100 d-flex' : 'd-none'
                        ),
                        children: [
                            new FolderContentView({ state: this.state, folderId: this.folder.id, displayMode$: this.displayMode$ })
                        ]
                    },
                    {
                        class: attr$(this.state.viewMode$,
                            (mode) => mode == 'navigation' ? 'd-none' : 'h-100 d-flex'
                        ),
                        children: [
                            child$(
                                this.state.viewMode$.pipe(filter(mode => mode != 'navigation')),
                                (preview: RunningApp) => preview.contentView
                            )
                        ]
                    },
                ]
            }
        ]
    }
}
