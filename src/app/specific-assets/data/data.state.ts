import { uuidv4 } from "@youwol/flux-core"
import { filter } from "rxjs/operators"
import { AppState, SelectedItem, TreeState } from "../../app.state"
import { AssetsBrowserClient } from "../../assets-browser.client"
import { Nodes, UploadStep } from "../../data"
import { DataApp } from "./data.view"


export class DataState {

    NodeType = Nodes.DataNode
    getApp(node: Nodes.DataNode) {
        return new DataApp({ item: node })
    }

    actions = [
        (state: AppState, { node }: SelectedItem, permissions) => ({
            icon: 'fas fa-eye',
            name: 'preview',
            enable: permissions.read,
            applicable: () => {
                return node instanceof Nodes.DataNode
            },
            exe: () => { state.run(new DataApp({ item: node as Nodes.DataNode })) }
        })
    ]

    constructor(public readonly userTree: TreeState) {

    }

    import(folder: Nodes.FolderNode, input: HTMLInputElement) {
        let uid = uuidv4()
        folder.addStatus({ type: 'request-pending', id: uid })

        let allProgresses = Array.from(input.files).map(file => {
            return AssetsBrowserClient.uploadFile$(folder, file)
        })
        allProgresses.forEach((progress$, i) => {
            let progressNode = new Nodes.ProgressNode({
                name: input.files[i].name,
                id: "progress_" + input.files[i].name,
                progress$
            })
            this.userTree.addChild(folder.id, progressNode)
        })
        allProgresses.forEach(request => {
            request.pipe(
                filter(progress => progress.step == UploadStep.FINISHED)
            ).subscribe((progress) => {
                let uploadNode = this.userTree.getNode("progress_" + progress.fileName)
                this.userTree.removeNode(uploadNode)
                let child = new Nodes.DataNode({
                    id: progress.result.treeId,
                    driveId: folder.driveId,
                    groupId: folder.groupId,
                    name: progress.result.name,
                    assetId: progress.result.assetId,
                    rawId: progress.result.rawId,
                    borrowed: progress.result.borrowed,
                })
                this.userTree.addChild(folder.id, child)
            })
        })
    }
}
