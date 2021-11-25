import { createObservableFromFetch, uuidv4 } from "@youwol/flux-core"
import { TreeGroup } from "../../app.state"
import { AssetsBrowserClient } from "../../assets-browser.client"
import { AnyFolderNode, DataNode, FutureNode, ItemNode } from "../../nodes"


export class StoryState {

    constructor(public readonly userTree: TreeGroup) {

    }

    static newStory$(node: AnyFolderNode) {

        let url = `${AssetsBrowserClient.urlBaseAssets}/story/location/${node.id}`
        let request = new Request(url, { method: 'PUT', headers: AssetsBrowserClient.headers })
        return createObservableFromFetch(request)
    }

    new(parentNode: AnyFolderNode) {
        let uid = uuidv4()
        parentNode.addStatus({ type: 'request-pending', id: uid })
        let node = new FutureNode({
            name: "new story",
            icon: "fas fa-book",
            request: StoryState.newStory$(parentNode),
            onResponse: (resp, node) => {
                parentNode.removeStatus({ type: 'request-pending', id: uid })
                let storyNode = new ItemNode({
                    id: resp.treeId,
                    kind: 'story',
                    groupId: parentNode.groupId,
                    driveId: parentNode.driveId,
                    name: resp.name,
                    assetId: resp.assetId,
                    rawId: resp.relatedId,
                    borrowed: false,
                })
                console.log("storyNode", storyNode)
                this.userTree.replaceNode(node, storyNode)
            }
        })
        this.userTree.addChild(parentNode.id, node)
    }

    read(node: DataNode) {
        window.open(`/ui/stories/?id=${node.rawId}`, '_blank').focus();
    }

}
