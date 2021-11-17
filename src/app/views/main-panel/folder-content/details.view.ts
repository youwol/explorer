import { attr$, VirtualDOM } from "@youwol/flux-view"
import { Subject } from "rxjs"
import { AppState } from "../../../app.state"
import { Nodes } from "../../../data"
import { RenamableItemView } from "./utils.view"




export class DetailsContentView {

    public readonly class = 'fv-text-primary w-100 h-100 d-flex flex-column text-center overflow-auto'
    public readonly style = { 'max-height': '100%' }
    public readonly children: VirtualDOM[]

    public readonly items: Nodes.BrowserNode[]

    public readonly state: AppState

    constructor(params: { state: AppState, items: Nodes.BrowserNode[] }) {

        Object.assign(this, params)

        console.log("Create cards view", { items: this.items })
        this.children = [
            {
                class: 'row w-100 justify-content-between py-2 border-bottom',
                style: {
                    fontWeight: 'bolder'
                },
                children: [
                    { innerText: 'Name', class: 'px-2 col-sm text-center' },
                    { innerText: 'Browser id', class: 'px-2 col-sm text-center' },
                    { innerText: 'Asset id', class: 'px-2 col-sm text-center' },
                    { innerText: 'raw id', class: 'px-2 col-sm text-center' }
                ]
            },
            {
                class: 'flex-grow-1 overflow-auto',
                children: this.items
                    .map((item: Nodes.FolderNode | Nodes.ItemNode) => {
                        let treeId = item.id
                        let assetId = ""
                        let rawId = ""
                        if (item instanceof Nodes.ItemNode) {
                            assetId = item.relatedId
                        }
                        return {
                            class: attr$(
                                this.state.selectedItem$,
                                (node) => {
                                    return node && node.id == item.id ?
                                        'fv-text-focus' :
                                        'fv-hover-bg-background-alt fv-pointer '
                                },
                                {
                                    wrapper: (d) => `row w-100 justify-content-between ${d} text-center`,
                                    untilFirst: 'fv-hover-bg-background-alt fv-pointer row w-100 text-center justify-content-between'
                                }
                            ),
                            onclick: () => {
                                this.state.selectItem(item)
                            },
                            ondblclick: () => this.state.openFolder(item),
                            children: [
                                { class: 'col-sm', children: [new RenamableItemView({ state: this.state, item })] },
                                this.cellView(treeId),
                                this.cellView(assetId),
                                this.cellView(rawId),
                            ]
                        }
                    })
            }
        ]
    }

    cellView(name: string, icon: string = ""): VirtualDOM {

        return {
            class: 'px-2 col-sm my-auto',
            children: [
                {
                    class: 'd-flex align-items-center',
                    children: [{
                        class: `${icon} mr-1`
                    },
                    {
                        class: 'mx-auto',
                        style: {
                            userSelect: 'none',
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "100px",
                            overflow: "hidden"
                        },
                        innerText: name
                    }]
                }
            ]
        }
    }
}
