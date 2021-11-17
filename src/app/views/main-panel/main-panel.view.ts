import { child$, children$, Stream$, VirtualDOM } from "@youwol/flux-view";
import { BehaviorSubject } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";
import { AppState, SelectedItem } from "../../app.state";
import { Nodes } from "../../data";
import { ActionsView } from "./actions-view";
import { FolderContentView } from "./folder-content/folder-content.view";
import { HeaderPathView } from "./header-path.view";


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
        this.children = [
            new HeaderPathView({ state: this.state, displayMode$: this.displayMode$ }),
            {
                class: 'flex-grow-1',
                style: { minHeight: '0px' },
                children: [
                    {
                        class: 'd-flex h-100',
                        children: [
                            new FolderContentView({ state: this.state, folderId: this.folder.id, displayMode$: this.displayMode$ }),
                            new ActionsView({ state: this.state })
                        ]
                    }
                ]
            }
        ]
    }
}
