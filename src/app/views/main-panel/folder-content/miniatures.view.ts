import { attr$, VirtualDOM } from "@youwol/flux-view"
import { Subject } from "rxjs"
import { AppState } from "../../../app.state"
import { Nodes } from "../../../data"
import { RenamableItemView } from "./utils.view"




export class MiniaturesContentView {

    public readonly class = 'd-flex flex-wrap w-100 overflow-auto'
    public readonly style = { 'max-height': '100%' }
    public readonly children: VirtualDOM[]

    public readonly items: Nodes.BrowserNode[]

    public readonly state: AppState

    constructor(params: { state: AppState, items: Nodes.BrowserNode[] }) {

        Object.assign(this, params)

        console.log("Create cards view", { items: this.items })
        this.children = this.items.map((item: Nodes.ItemNode | Nodes.FolderNode) => {
            return new RenamableItemView({ state: this.state, item })
        })
    }
}
