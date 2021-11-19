import { createObservableFromFetch, uuidv4 } from "@youwol/flux-core"
import { AppState, SelectedItem, TreeGroup } from "../../app.state"
import { AssetsBrowserClient } from "../../assets-browser.client"
import { Nodes } from "../../data"
import { FluxApp, RenderModeUrls } from "./flux.view"


export class FluxState {

    NodeType = Nodes.FluxProjectNode
    getApp(node: Nodes.FluxProjectNode) {
        return new FluxApp({ item: node })
    }

    actions = [
        (state: AppState, { node }: SelectedItem, permissions) => ({
            icon: 'fas fa-eye',
            name: 'preview',
            enable: permissions.read,
            applicable: () => {
                return node instanceof Nodes.FluxProjectNode
            },
            exe: () => { state.run(new FluxApp({ item: node as any })) }
        }),
        (state: AppState, { node }: SelectedItem, permissions) => ({
            icon: 'fas fa-play',
            name: 'run',
            enable: permissions.read,
            applicable: () => {
                return node instanceof Nodes.FluxProjectNode
            },
            exe: () => { state.flux.run(node as any) }
        }),
        (state: AppState, { node }: SelectedItem, permissions) => ({
            icon: 'fas fa-tools',
            name: 'construct',
            enable: permissions.write,
            applicable: () => {
                return node instanceof Nodes.FluxProjectNode
            },
            exe: () => { state.flux.construct(node as any) }
        }),
    ]

    constructor(public readonly userTree: TreeGroup) {

    }
    static newFluxProject$(node: Nodes.FolderNode) {

        let url = `${AssetsBrowserClient.urlBaseAssets}/flux-project/location/${node.id}`
        let request = new Request(url, { method: 'PUT', headers: AssetsBrowserClient.headers })
        return createObservableFromFetch(request)
    }

    new(parentNode: Nodes.FolderNode) {
        let uid = uuidv4()
        parentNode.addStatus({ type: 'request-pending', id: uid })
        let node = new Nodes.FutureNode({
            name: "new project",
            icon: "fas fa-play",
            request: FluxState.newFluxProject$(parentNode),
            onResponse: (resp, node) => {
                let projectNode = new Nodes.FluxProjectNode({
                    id: resp.treeId,
                    groupId: parentNode.groupId,
                    driveId: parentNode.driveId,
                    name: resp.name,
                    assetId: resp.assetId,
                    rawId: resp.relatedId,
                    borrowed: false,
                })
                this.userTree.replaceNode(node, projectNode)
            }
        })
        this.userTree.addChild(parentNode.id, node)
    }

    construct(node: Nodes.FluxProjectNode) {
        window.open(RenderModeUrls['builder'](node.rawId), '_blank').focus();
    }

    run(node: Nodes.FluxProjectNode) {
        window.open(RenderModeUrls['runner'](node.rawId), '_blank').focus();
    }
}
