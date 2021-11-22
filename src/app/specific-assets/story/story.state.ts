import { createObservableFromFetch, uuidv4 } from "@youwol/flux-core"
import { AppState, SelectedItem, TreeGroup } from "../../app.state"
import { AssetsBrowserClient } from "../../assets-browser.client"
import { Nodes } from "../../data"
//import { StoryApp } from "./story.view"


export class StoryState {

    NodeType = Nodes.StoryNode

    constructor(public readonly userTree: TreeGroup) {

    }

    static newStory$(node: Nodes.FolderNode) {

        let url = `${AssetsBrowserClient.urlBaseAssets}/story/location/${node.id}`
        let request = new Request(url, { method: 'PUT', headers: AssetsBrowserClient.headers })
        return createObservableFromFetch(request)
    }

    new(parentNode: Nodes.FolderNode) {
        let uid = uuidv4()
        parentNode.addStatus({ type: 'request-pending', id: uid })
        let node = new Nodes.FutureNode({
            name: "new story",
            icon: "fas fa-book",
            request: StoryState.newStory$(parentNode),
            onResponse: (resp, node) => {
                parentNode.removeStatus({ type: 'request-pending', id: uid })
                let storyNode = new Nodes.StoryNode({
                    id: resp.treeId,
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

    read(node: Nodes.StoryNode) {
        window.open(`/ui/stories/?id=${node.rawId}`, '_blank').focus();
    }

}
