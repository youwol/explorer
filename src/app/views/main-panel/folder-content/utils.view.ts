import { attr$, child$, Stream$, VirtualDOM } from "@youwol/flux-view";
import { ywSpinnerView } from "@youwol/flux-youwol-essentials";
import { AppState } from "../../../app.state";
import { Nodes } from "../../../data";
import { FluxApp } from "../../../specific-assets/flux/flux.view";
import { StoryApp } from "../../../specific-assets/story/story.view";



export class RenamableItemView {

    baseClasses = 'd-flex align-items-center p-1 rounded m-3 fv-hover-bg-background-alt fv-pointer'
    class: Stream$<Nodes.BrowserNode, string>
    children: VirtualDOM[]
    public readonly style = {
        userSelect: 'none'
    }
    public readonly onclick: any
    public readonly ondblclick: any
    public readonly state: AppState
    public readonly item: Nodes.FolderNode | Nodes.ItemNode

    constructor(params: { state: AppState, item: Nodes.FolderNode | Nodes.ItemNode }) {
        Object.assign(this, params)

        let baseClass = 'd-flex align-items-center p-1 rounded m-2 fv-hover-bg-background-alt fv-pointer'
        this.class = attr$(
            this.state.selectedItem$,
            (node) => {
                return node && node.id == this.item.id ?
                    `${baseClass} fv-text-focus` :
                    `${baseClass}`
            },
            { untilFirst: baseClass }
        )
        this.children = [
            {
                class: `fas ${this.item.icon} mr-1`
            },
            child$(
                this.item.status$,
                statusList => statusList.find(s => s.type == 'renaming')
                    ? this.editView()
                    : { innerText: this.item.name }
            ),
            child$(
                this.item.status$,
                (status) => {
                    return status.find(s => s.type == 'request-pending')
                        ? ywSpinnerView({ classes: 'mx-auto my-auto', size: '15px', duration: 1.5 })
                        : {}
                }
            )
        ]
        this.onclick = () => this.state.selectItem(this.item),
            this.ondblclick = () => {
                let s = this.state.allStates.find((s) => this.item instanceof s.NodeType)
                if (!s) {
                    return
                }
                this.state.run(s.getApp(this.item))
            }
    }

    editView() {

        return {
            tag: 'input',
            type: 'text',
            autofocus: true,
            style: { "z-index": 200 },
            class: "mx-2",
            data: this.item.name,
            onclick: (ev) => ev.stopPropagation(),
            onkeydown: (ev) => {
                if (ev.key === 'Enter')
                    this.state.rename(this.item, ev.target.value)
            }
        }

    }
}
