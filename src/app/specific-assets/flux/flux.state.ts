import { createObservableFromFetch, uuidv4 } from "@youwol/flux-core"
import { TreeGroup } from "../../app.state"
import { AnyFolderNode, FutureNode, ItemNode } from "../../nodes"

export class FluxState {

    constructor(public readonly userTree: TreeGroup) {

    }
    static newFluxProject$(node: AnyFolderNode) {

        let url = `/api/assets-gateway/flux-project/location/${node.id}`
        let request = new Request(url, { method: 'PUT', headers: {} })
        return createObservableFromFetch(request)
    }

    new(parentNode: AnyFolderNode) {
        let uid = uuidv4()
        parentNode.addStatus({ type: 'request-pending', id: uid })
        let node = new FutureNode({
            name: "new project",
            icon: "fas fa-play",
            request: FluxState.newFluxProject$(parentNode),
            onResponse: (resp, node) => {
                let projectNode = new ItemNode({
                    id: resp.treeId,
                    kind: 'flux-project',
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

}
