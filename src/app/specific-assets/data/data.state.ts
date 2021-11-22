import { uuidv4 } from "@youwol/flux-core"
import { BehaviorSubject } from "rxjs"
import { filter } from "rxjs/operators"
import { AppState, SelectedItem, TreeGroup } from "../../app.state"
import { AssetsBrowserClient } from "../../assets-browser.client"
import { Nodes, progressMessage, UploadStep } from "../../data"
//import { DataApp } from "./data.view"


export class DataState {

    NodeType = Nodes.DataNode

    constructor(public readonly userTree: TreeGroup) {
    }

    static uploadFile$(node: Nodes.FolderNode, file: File) {

        let url = `/api/assets-gateway/assets/data/location/${node.id}?group-id=${node.groupId}`
        let progress$ = new BehaviorSubject(new progressMessage(file.name, UploadStep.START))
        var formData = new FormData();
        formData.append("file", file);
        var request = new XMLHttpRequest();

        request.upload.onprogress = (event) => {
            console.log('on-progress', file.name, 100 * event.loaded / event.total)
            let message = event.loaded == event.total
                ? new progressMessage(file.name, UploadStep.PROCESSING, Math.floor(100 * event.loaded / event.total))
                : new progressMessage(file.name, UploadStep.SENDING, Math.floor(100 * event.loaded / event.total))
            progress$.next(message)
        };

        request.open("PUT", url, true);
        Object.entries(AssetsBrowserClient.headers).forEach(([k, v]) => request.setRequestHeader(k, v))
        request.onload = (e) => {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    let resp = JSON.parse(request.responseText);
                    setTimeout(() => progress$.next(new progressMessage(file.name, UploadStep.FINISHED, 100, resp)), 500)
                } else {
                    console.error(request.statusText);
                }
            }
        };
        request.send(formData);
        return progress$
    }

    import(folder: Nodes.FolderNode, input: HTMLInputElement) {
        let uid = uuidv4()
        folder.addStatus({ type: 'request-pending', id: uid })

        let allProgresses = Array.from(input.files).map(file => {
            return DataState.uploadFile$(folder, file)
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
