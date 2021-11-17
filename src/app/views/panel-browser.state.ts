import { uuidv4 } from '@youwol/flux-core'
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs'
import { filter, map, mergeMap } from 'rxjs/operators'

import { AssetsBrowserClient, Drive, Folder } from '../assets-browser.client'
import { Asset, Favorite, Nodes, UploadStep } from '../data'
import { getStoredFavorites } from './utils'
import { ImmutableTree } from '@youwol/fv-tree'

export class BrowserState extends ImmutableTree.State<Nodes.BrowserNode>{


    itemCut: {
        cutType: string
        node: Nodes.ItemNode | Nodes.FolderNode
    }
    favorites$ = new BehaviorSubject<Array<{ assetId: string }>>([])

    constructor(rootNode: Nodes.BrowserNode, public readonly command$: Subject<{ type: string }>) {
        super({ rootNode })
    }

    expandFavoritesBar() {
        this.favorites$.next(getStoredFavorites())
    }
    collapseFavoritesBar() {
        this.favorites$.next([])
    }

    addFavorite(node: Nodes.FolderNode) {
    }

    newDrive(node: Nodes.GroupNode) {

        let uid = uuidv4()
        node.addStatus({ type: 'request-pending', id: uid })
        AssetsBrowserClient.newDrive$(node).subscribe((resp: Drive) => {

            node.removeStatus({ type: 'request-pending', id: uid })
            this.addChild(node, new Nodes.DriveNode({
                id: resp.driveId,
                groupId: node.id,
                driveId: resp.driveId,
                name: resp.name,
                children: []
            }))
        })
    }



    purgeDrive(node: Nodes.TrashNode) {

        let uid = uuidv4()
        node.addStatus({ type: 'request-pending', id: uid })
        AssetsBrowserClient.purgeDrive$(node).subscribe((resp) => {
            node.removeStatus({ type: 'request-pending', id: uid })
            this.replaceNode(node, new Nodes.TrashNode({ id: node.id, groupId: node.groupId, driveId: node.driveId, name: node.name, children: [] }))
        })
    }

    deleteItem$(node: Nodes.ItemNode): Observable<{ node, parentNode }> {

        let uid = uuidv4()
        node.addStatus({ type: 'request-pending', id: uid })
        return AssetsBrowserClient.deleteItem$(node).pipe(
            map((resp: Drive) => {
                node.removeStatus({ type: 'request-pending', id: uid })
                let parentNode = this.getParent(node.id)
                this.removeNode(node)

                let trashNode = this.getNode("trash_" + node.driveId)
                if (Array.isArray(trashNode.children)) {
                    let trashed = new Nodes.DeletedItemNode({ id: node.id, name: node.name, driveId: node.driveId, type: 'item' })
                    this.addChild(trashNode, trashed)
                }
                return { node, parentNode }
            })
        )
    }

    deleteFolder$(node: Nodes.FolderNode): Observable<{ node, parentNode }> {
        let uid = uuidv4()
        node.addStatus({ type: 'request-pending', id: uid })

        return AssetsBrowserClient.deleteFolder$(node).pipe(
            map((resp) => {

                node.removeStatus({ type: 'request-pending', id: uid })
                let parentNode = this.getParent(node.id)
                this.removeNode(node)
                let trashNode = this.getNode("trash_" + node.driveId)
                if (Array.isArray(trashNode.children)) {
                    let trashed = new Nodes.DeletedItemNode({ id: node.id, name: node.name, driveId: node.driveId, type: 'item' })
                    this.addChild(trashNode, trashed)
                }
                return { node, parentNode }
            })
        )
    }

    deleteDrive$(node: Nodes.DriveNode): Observable<{ node, parentNode }> {

        let uid = uuidv4()
        node.addStatus({ type: 'request-pending', id: uid })
        return AssetsBrowserClient.deleteDrive$(node).pipe(
            map((resp) => {
                node.removeStatus({ type: 'request-pending', id: uid })
                let parentNode = this.getParent(node.id)
                this.removeNode(node)
                return { node, parentNode }
            })
        )
    }


    renameAsset$(target: Nodes.ItemNode | string, newName: string): Observable<{ node: Nodes.ItemNode, respData: any }> {

        let uid = uuidv4()
        let node = typeof (target) == 'string' ? this.getNode(target) as Nodes.ItemNode : target
        node.addStatus({ type: 'request-pending', id: uid })
        return AssetsBrowserClient.renameAsset$(node, newName).pipe(
            map((respData: any) => {
                node.removeStatus({ type: 'request-pending', id: uid })
                this.replaceAttributes(node, { name: newName })
                return { node, respData }
            })
        )
    }

    renameFolder$(node: Nodes.FolderNode, newName: string): Observable<{ node: Nodes.FolderNode, respData: any }> {

        let uid = uuidv4()
        node.addStatus({ type: 'request-pending', id: uid })
        return AssetsBrowserClient.renameFolder$(node, newName).pipe(
            map((respData: Folder) => {
                node.removeStatus({ type: 'request-pending', id: uid })
                this.replaceAttributes(node, { name: newName })
                return { node, respData }
            })
        )
    }

    renameDrive$(node: Nodes.DriveNode, newName: string): Observable<{ node: Nodes.DriveNode, respData: any }> {

        let uid = uuidv4()
        node.addStatus({ type: 'request-pending', id: uid })
        return AssetsBrowserClient.renameDrive$(node, newName).pipe(
            map((respData) => {
                node.removeStatus({ type: 'request-pending', id: uid })
                this.replaceAttributes(node, { name: newName })
                return { node, respData }
            })
        )
    }

    newFluxProject$(parentNode: Nodes.FolderNode): Observable<{ node: Nodes.FluxProjectNode, parentNode: Nodes.FolderNode | Nodes.DriveNode }> {

        let uid = uuidv4()
        parentNode.addStatus({ type: 'request-pending', id: uid })

        return AssetsBrowserClient.newFluxProject$(parentNode).pipe(
            map((resp: any) => {
                parentNode.removeStatus({ type: 'request-pending', id: uid })
                let projectNode = new Nodes.FluxProjectNode({
                    id: resp.treeId,
                    groupId: parentNode.groupId,
                    driveId: parentNode.driveId,
                    name: resp.name,
                    assetId: resp.assetId,
                    relatedId: resp.relatedId,
                    borrowed: false,
                })
                this.addChild(parentNode, projectNode)
                return { node: projectNode, parentNode }
            })
        )
    }

    newStory$(parentNode: Nodes.FolderNode): Observable<{ node: Nodes.StoryNode, parentNode: Nodes.FolderNode | Nodes.DriveNode }> {

        let uid = uuidv4()
        parentNode.addStatus({ type: 'request-pending', id: uid })

        return AssetsBrowserClient.newStory$(parentNode).pipe(
            map((resp: any) => {
                parentNode.removeStatus({ type: 'request-pending', id: uid })
                let projectNode = new Nodes.StoryNode({
                    id: resp.treeId,
                    groupId: parentNode.groupId,
                    driveId: parentNode.driveId,
                    name: resp.name,
                    assetId: resp.assetId,
                    relatedId: resp.relatedId,
                    borrowed: false,
                })
                this.addChild(parentNode, projectNode)
                return { node: projectNode, parentNode }
            })
        )
    }

    newGroupShowcase$(parentNode: Nodes.FolderNode, { groupId, path }):
        Observable<{ node: Nodes.ExposedGroupNode, parentNode: Nodes.FolderNode | Nodes.DriveNode }> {

        let uid = uuidv4()
        parentNode.addStatus({ type: 'request-pending', id: uid })

        return AssetsBrowserClient.exposeGroup$(parentNode, { groupId, name: path }).pipe(
            map((resp: any) => {
                parentNode.removeStatus({ type: 'request-pending', id: uid })
                let child = new Nodes.ExposedGroupNode({
                    id: resp.treeId,
                    driveId: parentNode.driveId,
                    groupId: parentNode.groupId,
                    name: resp.name,
                    assetId: resp.assetId,
                    relatedId: resp.relatedId,
                    borrowed: resp.borrowed
                })
                this.addChild(parentNode, child)
                return { node: child, parentNode: this.getNode(parentNode.id) }
            })
        )
    }


    package(node: Nodes.DriveNode) {
        let uid = uuidv4()
        node.addStatus({ type: 'request-pending', id: uid })
        AssetsBrowserClient.package$(node)
            .subscribe((resp: any) => {
                node.removeStatus({ type: 'request-pending', id: uid })

                this.addChild(node, new Nodes.DataNode({
                    id: resp.treeId,
                    driveId: node.driveId,
                    groupId: node.groupId,
                    name: resp.name,
                    assetId: resp.assetId,
                    relatedId: resp.rawId,
                    borrowed: false,
                }))
            })
    }

    unpackage(node: Nodes.ItemNode) {
        let uid = uuidv4()
        node.addStatus({ type: 'request-pending', id: uid })
        AssetsBrowserClient.unpackage$(node)
            .pipe(
                mergeMap(() => AssetsBrowserClient.getFolderChildren$(node.groupId, node.driveId, node.driveId))
            )
            .subscribe((resp: any) => {
                console.log("Resp", resp)

                let parent = this.getParent(node.id)
                resp.filter(n => n.id != node.id)
                    .forEach((n, i, elems) => {
                        this.addChild(parent.id, n, i == elems.length - 1)
                    })
                node.removeStatus({ type: 'request-pending', id: uid })

            })
    }

    toggleRenaming(node: Nodes.BrowserNode) {
        node.addStatus({ type: 'renaming' })
    }

    importAssets(node: Nodes.FolderNode, assets: Array<Asset>) {

        let uid = uuidv4()
        node.addStatus({ type: 'request-pending', id: uid })

        let fluxProjectsAssets = assets.filter(asset => asset.kind == 'flux-project')
        let fluxPacksAssets = assets.filter(asset => asset.kind == 'flux-pack')

        let format = (asset) => ({
            id: asset.assetId,
            driveId: node.driveId,
            groupId: node.groupId,
            name: asset.name,
            assetId: asset.assetId,
            relatedId: asset.relatedId,
            borrowed: false
        })
        combineLatest([
            AssetsBrowserClient.importFluxProjects$(node, fluxProjectsAssets),
            AssetsBrowserClient.importFluxPacks$(node, fluxPacksAssets)])
            .subscribe(([respProjects, respPacks]: [any, any]) => {
                node.removeStatus({ type: 'request-pending', id: uid })

                respProjects.items.forEach((asset, i) => {
                    let childApp = new Nodes.FluxProjectNode(format(asset))
                    this.addChild(node.id, childApp, i == assets.length - 1)
                })
                respPacks.items.forEach((asset, i) => {
                    let childApp = new Nodes.FluxPackNode(format(asset))
                    this.addChild(node.id, childApp, i == assets.length - 1)
                })
                // redo the previous search query
                this.command$.next({ type: "refresh" })
            })
    }

    addPackage(folder: Nodes.FolderNode, input: HTMLInputElement) {

        let progress$ = AssetsBrowserClient.uploadPackage$(folder, input.files[0])
        let progressNode = new Nodes.ProgressNode({
            name: input.files[0].name,
            id: "progress_" + input.files[0].name,
            progress$
        })
        this.addChild(folder.id, progressNode)

        progress$.pipe(
            filter(progress => progress.step == UploadStep.FINISHED)
        ).subscribe((progress) => {
            let uploadNode = this.getNode("progress_" + progress.fileName)
            this.removeNode(uploadNode)
            let child = new Nodes.PackageNode({
                id: progress.result.treeId,
                driveId: folder.driveId,
                groupId: folder.groupId,
                name: progress.result.name,
                assetId: progress.result.assetId,
                relatedId: progress.result.rawId,
                borrowed: false,
            })
            this.addChild(folder.id, child)
            // redo the previous search query
            this.command$.next({ type: "refresh" })
        })
    }


    borrowItem(node: Nodes.ItemNode) {
        node.addStatus({ type: 'cut' })
        this.itemCut = { cutType: 'borrow', node }
    }


    cutItem(node: Nodes.ItemNode | Nodes.FolderNode) {
        node.addStatus({ type: 'cut' })
        this.itemCut = { cutType: 'move', node }
    }

    pasteItem(container: Nodes.FolderNode | Nodes.DriveNode) {

        if (this.itemCut) {
            let uid = uuidv4()
            container.addStatus({ type: 'request-pending', id: uid })
            let nodePasted = this.itemCut.node
            if (this.itemCut.cutType == 'move') {

                AssetsBrowserClient.move$(nodePasted, container).subscribe(
                    (resp) => {
                        container.removeStatus({ type: 'request-pending', id: uid })
                        let children = AssetsBrowserClient.children(container.groupId, container.driveId, container.id, resp)

                        let newFolder = container instanceof Nodes.FolderNode
                            ? new Nodes.FolderNode(Object.assign({}, container, { children: children }))
                            : new Nodes.DriveNode(Object.assign({}, container, { children: children }))
                        this.removeNode(nodePasted, false)
                        this.replaceNode(container, newFolder)
                        nodePasted.removeStatus({ type: 'cut' })
                        this.itemCut = undefined
                    }
                )
            }
            if (this.itemCut.cutType == 'borrow') {

                AssetsBrowserClient.borrow$(nodePasted, container).subscribe(
                    (resp) => {
                        container.removeStatus({ type: 'request-pending', id: uid })
                        let child = Nodes.itemNodeFactory(resp)

                        this.addChild(container.id, child)
                        nodePasted.removeStatus({ type: 'cut' })
                        this.itemCut = undefined
                    }
                )
            }
        }
    }

    uploadFiles(folder: Nodes.FolderNode, input: HTMLInputElement) {

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
            this.addChild(folder.id, progressNode)
        })
        allProgresses.forEach(request => {
            request.pipe(
                filter(progress => progress.step == UploadStep.FINISHED)
            ).subscribe((progress) => {
                let uploadNode = this.getNode("progress_" + progress.fileName)
                this.removeNode(uploadNode)
                let child = new Nodes.DataNode({
                    id: progress.result.treeId,
                    driveId: folder.driveId,
                    groupId: folder.groupId,
                    name: progress.result.name,
                    assetId: progress.result.assetId,
                    relatedId: progress.result.relatedId,
                    borrowed: progress.result.borrowed,
                })
                this.addChild(folder.id, child)
                // redo the previous search query
                this.command$.next({ type: "refresh" })
            })
        })

        combineLatest(allProgresses).pipe(
            filter(progresses => progresses.filter(p => p.step == UploadStep.FINISHED).length == progresses.length)
        )
            .subscribe(
                (resp: any) => {
                    folder.removeStatus({ type: 'request-pending', id: uid })
                }
            )
    }
}
