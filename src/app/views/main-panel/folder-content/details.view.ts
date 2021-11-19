import { attr$, children$, VirtualDOM } from "@youwol/flux-view"
import { AppState } from "../../../app.state"
import { Nodes } from "../../../data"
import { Action, getActions$ } from "../../../actions.factory"
import { RenamableItemView } from "./utils.view"




export class DetailsContentView {

    public readonly class = 'fv-text-primary w-100 h-100 d-flex flex-column text-center overflow-auto'
    public readonly style = { 'max-height': '100%' }
    public readonly children: VirtualDOM[]

    public readonly items: Nodes.BrowserNode[]

    public readonly state: AppState

    constructor(params: { state: AppState, items: Nodes.BrowserNode[] }) {

        Object.assign(this, params)
        console.log("DetailsContentView")
        this.children = [
            {
                class: 'row w-100 justify-content-between py-2 border-bottom',
                style: {
                    fontWeight: 'bolder'
                },
                children: [
                    { innerText: 'Name', class: 'px-2 col-sm text-center' },
                    { innerText: 'actions', class: 'px-2 col-sm text-center' },
                    { innerText: 'permissions', class: 'px-2 col-sm text-center' },
                    { innerText: 'Record id', class: 'px-2 col-sm text-center' },
                    { innerText: 'URL', class: 'px-2 col-sm text-center' }
                ]
            },
            {
                class: 'flex-grow-1 overflow-auto',
                children: this.items
                    .map((item: Nodes.FolderNode | Nodes.ItemNode) => {
                        let treeId = item.id
                        let url = ""
                        if (item instanceof Nodes.DataNode) {
                            url = `/api/assets-gateway/raw/data/${item.rawId}`
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
                                this.cellActionsView(item),
                                this.cellPermissionsView(item),
                                this.cellView(treeId),
                                this.cellView(url),
                            ]
                        }
                    })
            }
        ]
    }

    cellActionsView(item) {
        return {
            class: 'col-sm',
            children: [
                {
                    class: 'd-flex align-items-center justify-content-center w-100 h-100 my-auto mx-auto',
                    children: children$(
                        getActions$(this.state, { node: item, selection: 'direct' }, this.state.specificActions),
                        (actions: Action[]) => {
                            return actions.map((action) => this.actionView(action))
                        }
                    )
                }
            ]
        }
    }

    actionView(action: Action) {
        return {
            class: `${action.icon} fv-hover-text-focus fv-pointer mx-2`,
            onclick: () => action.exe()
        }
    }

    cellPermissionsView(item) {

        return {
            class: 'col-sm',
            children: [
                {
                    class: 'd-flex align-items-center justify-content-center w-100 h-100 my-auto mx-auto',
                    children: [
                        {
                            class: 'fas fa-glasses fv-text-success mx-1'
                        },
                        {
                            class: 'fas fa-tools fv-text-success mx-1'
                        }
                    ]
                }
            ]
        }
    }

    cellView(name: string, icon: string = ""): VirtualDOM {

        return {
            class: 'px-2 col-sm',
            children: [
                {
                    class: 'd-flex align-items-center h-100 my-auto mx-auto',
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
