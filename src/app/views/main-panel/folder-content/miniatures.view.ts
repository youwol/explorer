import { VirtualDOM } from "@youwol/flux-view"
import { AppState } from "../../../app.state"
import { BrowserNode } from "../../../nodes"
import { RenamableItemView } from "./utils.view"


export class MiniaturesContentView {

    public readonly class = 'd-flex flex-wrap w-100 overflow-auto'
    public readonly style = { 'max-height': '100%' }
    public readonly children: VirtualDOM[]

    public readonly items: BrowserNode[]

    public readonly state: AppState

    constructor(params: { state: AppState, items: BrowserNode[] }) {

        Object.assign(this, params)

        console.log("Create cards view", { items: this.items })
        this.children = this.items.map((item: BrowserNode) => {
            return new RenamableItemView({ state: this.state, item })
        })
    }
}
