import { attr$, child$, children$, VirtualDOM } from "@youwol/flux-view";
import { BehaviorSubject, combineLatest, Observable, Subject } from "rxjs";
import { map, mergeMap } from "rxjs/operators";
import { AppState, TreeGroup } from "../../../app.state";
import { Nodes } from "../../../data";
import { DisplayMode } from "../main-panel.view";
import { DetailsContentView } from "./details.view";
import { MiniaturesContentView } from "./miniatures.view";

function unreachable(mode: never) {

}

export class FolderContentView implements VirtualDOM {

    public readonly class = 'flex-grow-1 fv-text-primary h-100 px-3'
    public readonly style = { border: 'thick double' }

    public readonly state: AppState
    public readonly folderId: string
    public readonly groupId: string

    public readonly children: VirtualDOM[]
    public readonly displayMode$: Subject<DisplayMode>

    public readonly tree: TreeGroup

    constructor(params: { state: AppState, folderId: string, groupId: string, displayMode$: Subject<DisplayMode> }) {

        Object.assign(this, params)
        this.tree = this.state.groupsTree[this.groupId]
        let items$ = this.tree.root$.pipe(
            map((root) => {
                return root.id == this.folderId
                    ? root
                    : this.tree.getNode(this.folderId)
            }),
            map(node => node.children)
        )

        this.children = [
            child$(
                combineLatest([this.displayMode$, items$]),
                ([mode, items]: [DisplayMode, Nodes.BrowserNode[]]) => {
                    switch (mode) {
                        case 'cards':
                            return this.cardsView(items)
                        case 'miniatures':
                            return new MiniaturesContentView({ state: this.state, items })
                        case 'details':
                            return new DetailsContentView({ state: this.state, items })
                        default:
                            unreachable(mode)
                    }
                })
        ]
    }

    cardsView(items: Nodes.BrowserNode[]): VirtualDOM {
        return {
            children: items.map((child) => {
                return { innerText: child.name }
            })
        }
    }

}
