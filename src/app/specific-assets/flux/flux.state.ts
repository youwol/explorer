import { uuidv4 } from "@youwol/flux-core"
import { AppState, SelectedItem, TreeState } from "../../app.state"
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

    constructor(public readonly homeTreeState: TreeState) {

    }

    new(parentNode: Nodes.FolderNode) {
        let uid = uuidv4()
        parentNode.addStatus({ type: 'request-pending', id: uid })
        let node = new Nodes.FutureNode({
            name: "new project",
            icon: "fas fa-play",
            request: AssetsBrowserClient.newFluxProject$(parentNode),
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
                console.log("projectNode", projectNode)
                this.homeTreeState.replaceNode(node, projectNode)
            }
        })
        this.homeTreeState.addChild(parentNode.id, node)
    }

    construct(node: Nodes.FluxProjectNode) {
        window.open(RenderModeUrls['builder'](node.rawId), '_blank').focus();
    }

    run(node: Nodes.FluxProjectNode) {
        window.open(RenderModeUrls['runner'](node.rawId), '_blank').focus();
    }
}
