import { BehaviorSubject, Observable, of } from "rxjs";
import { delay, map, mergeMap, tap } from 'rxjs/operators';
import { Asset, Nodes, progressMessage, UploadStep } from './data';

import * as FluxLibCore from '@youwol/flux-core'
import { uuidv4 } from '@youwol/flux-core';
import { ImmutableTree } from "@youwol/fv-tree";

export class Drive {

    driveId: string
    name: string

    constructor({ driveId, name }: { driveId: string, name: string }) {
        this.driveId = driveId
        this.name = name
    }
}
export class Folder {

    folderId: string
    name: string
    parentFolderId: string

    constructor({ folderId, parentFolderId, name }: { parentFolderId: string, folderId: string, name: string }) {
        this.folderId = folderId
        this.name = name
        this.parentFolderId = parentFolderId
    }
}
export class Item {

    treeId: string
    name: string
    kind: string
    assetId: string
    rawId: string
    borrowed: boolean
    constructor({ treeId, name, kind, assetId, rawId, borrowed }:
        {
            treeId: string, name: string, kind: string,
            assetId: string, rawId: string, borrowed: boolean
        }) {

        this.treeId = treeId
        this.name = name
        this.kind = kind
        this.assetId = assetId
        this.rawId = rawId
        this.borrowed = borrowed
    }
}
let debugDelay = 1000

let databaseActionsFactory = {
    /*addFolder: (update: ImmutableTree.Updates<Nodes.BrowserNode>) => ({
        when: () => {
            return update.command instanceof ImmutableTree.AddChildCommand
                && update.addedNodes.length == 1
                && update.addedNodes[0] instanceof Nodes.FolderNode
        },
        then: () => {
            let node = update.addedNodes[0]
            let cmd = update.command as ImmutableTree.AddChildCommand<Nodes.FolderNode>
            let uid = uuidv4()
            node.addStatus({ type: 'request-pending', id: uid })
            AssetsBrowserClient.newFolder$(cmd.parentNode, { name: node.name, folderId: node.id }).pipe(
                delay(debugDelay)
            )
                .subscribe((resp: Folder) => {
                    cmd.parentNode.removeStatus({ type: 'request-pending', id: uid })
                })
        }
    }),*/
    renameFolder: (update: ImmutableTree.Updates<Nodes.BrowserNode>) => ({
        when: () => {
            return update.command instanceof ImmutableTree.ReplaceAttributesCommand
                && update.addedNodes.length == 1
                && update.addedNodes[0] instanceof Nodes.FolderNode
        },
        then: () => {
            let node = update.addedNodes[0] as Nodes.FolderNode
            let uid = uuidv4()
            node.addStatus({ type: 'request-pending', id: uid })
            AssetsBrowserClient.renameFolder$(node, node.name).pipe(
                delay(debugDelay)
            )
                .subscribe((resp: Folder) => {
                    node.removeStatus({ type: 'request-pending', id: uid })
                })
        }
    }),
    renameItem: (update: ImmutableTree.Updates<Nodes.BrowserNode>) => ({
        when: () => {
            return update.command instanceof ImmutableTree.ReplaceAttributesCommand
                && update.addedNodes.length == 1
                && update.addedNodes[0] instanceof Nodes.ItemNode
        },
        then: () => {
            let node = update.addedNodes[0] as Nodes.ItemNode
            let uid = uuidv4()
            node.addStatus({ type: 'request-pending', id: uid })
            AssetsBrowserClient.renameAsset$(node, node.name).pipe(
                delay(debugDelay)
            )
                .subscribe(() => {
                    node.removeStatus({ type: 'request-pending', id: uid })
                })
        }
    }),
    deleteFolder: (update: ImmutableTree.Updates<Nodes.BrowserNode>) => ({
        when: () => {
            return update.command instanceof ImmutableTree.RemoveNodeCommand
                && update.removedNodes.length == 1
                && update.removedNodes[0] instanceof Nodes.FolderNode
        },
        then: () => {
            let node = update.removedNodes[0] as Nodes.FolderNode
            let cmd = update.command as ImmutableTree.RemoveNodeCommand<Nodes.FolderNode>
            let parent = cmd.parentNode
            let uid = uuidv4()
            parent.addStatus({ type: 'request-pending', id: uid })
            AssetsBrowserClient.deleteFolder$(node).pipe(
                delay(debugDelay)
            )
                .subscribe(() => {
                    parent.removeStatus({ type: 'request-pending', id: uid })
                })
        }
    }),
    deleteItem: (update: ImmutableTree.Updates<Nodes.BrowserNode>) => ({
        when: () => {
            return update.command instanceof ImmutableTree.RemoveNodeCommand
                && update.removedNodes.length == 1
                && update.removedNodes[0] instanceof Nodes.ItemNode
        },
        then: () => {
            let node = update.removedNodes[0] as Nodes.ItemNode
            let cmd = update.command as ImmutableTree.RemoveNodeCommand<Nodes.FolderNode>
            let parent = cmd.parentNode
            let uid = uuidv4()
            parent.addStatus({ type: 'request-pending', id: uid })
            AssetsBrowserClient.deleteItem$(node).pipe(
                delay(debugDelay)
            )
                .subscribe(() => {
                    parent.removeStatus({ type: 'request-pending', id: uid })
                })
        }
    }),
    newAsset: (update: ImmutableTree.Updates<Nodes.BrowserNode>) => ({
        when: () => {
            return update.command instanceof ImmutableTree.AddChildCommand
                && update.addedNodes.length == 1
                && update.addedNodes[0] instanceof Nodes.FutureNode
        },
        then: () => {
            let node = update.addedNodes[0] as Nodes.FutureNode
            let cmd = update.command as ImmutableTree.AddChildCommand<Nodes.BrowserNode>
            let parentNode = cmd.parentNode as Nodes.FolderNode
            let uid = uuidv4()
            node.addStatus({ type: 'request-pending', id: uid })
            parentNode.addStatus({ type: 'request-pending', id: uid })
            node.request.pipe(
                delay(debugDelay)
            ).subscribe((resp: any) => {
                parentNode.removeStatus({ type: 'request-pending', id: uid })
                node.removeStatus({ type: 'request-pending', id: uid })
                node.onResponse(resp, node)
            })
        }
    }),
}
export class AssetsBrowserClient {

    static urlBase = '/api/assets-gateway'
    static urlBaseOrganization = '/api/assets-gateway/tree'
    static urlBaseAssets = '/api/assets-gateway/assets'
    static urlBaseRaws = '/api/assets-gateway/raw'

    static allGroups = undefined

    static headers: { [key: string]: string } = {}

    static execute(update: ImmutableTree.Updates<Nodes.BrowserNode>) {

        let command = Object.values(databaseActionsFactory)
            .map(actionFactory => actionFactory(update))
            .find(action => action.when())
        console.log("Execute command", { update, command })
        command && command.then()
    }
    static setHeaders(headers: { [key: string]: string }) {
        AssetsBrowserClient.headers = headers
    }

    static getUserInfo$() {
        let url = `${AssetsBrowserClient.urlBase}/user-info`
        let request = new Request(url, { headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }

    static getDefaultDrive$() {
        let url = `${AssetsBrowserClient.urlBaseOrganization}/drives/default-drive`
        let request = new Request(url, { headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }


    static newDrive$(node: Nodes.GroupNode) {

        let url = `${AssetsBrowserClient.urlBaseOrganization}/groups/${node.id}/drives`
        let body = { "name": "new drive" }

        let request = new Request(url, { method: 'PUT', body: JSON.stringify(body), headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }

    static deleteItem$(node: Nodes.FluxProjectNode) {

        let url = `${AssetsBrowserClient.urlBaseOrganization}/items/${node.id}`
        let uid = uuidv4()
        node.addStatus({ type: 'request-pending', id: uid })
        let request = new Request(url, { method: 'DELETE', headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }

    static deleteFolder$(node: Nodes.FolderNode) {

        let url = `${AssetsBrowserClient.urlBaseOrganization}/folders/${node.id}`

        let uid = uuidv4()
        node.addStatus({ type: 'request-pending', id: uid })
        let request = new Request(url, { method: 'DELETE', headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }

    static deleteDrive$(node: Nodes.DriveNode) {

        let url = `${AssetsBrowserClient.urlBaseOrganization}/drives/${node.id}`

        let uid = uuidv4()
        node.addStatus({ type: 'request-pending', id: uid })
        let request = new Request(url, { method: 'DELETE', headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }

    static purgeDrive$(node: Nodes.TrashNode) {

        let url = AssetsBrowserClient.urlBaseOrganization + `/drives/${node.driveId}/purge`
        let request = new Request(url, { method: 'DELETE', headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }

    static newFolder$(node: Nodes.DriveNode | Nodes.FolderNode, body: { name: string, folderId: string }) {

        let url = `${AssetsBrowserClient.urlBaseOrganization}/folders/${node.id}`

        let request = new Request(url, {
            method: 'PUT', body: JSON.stringify(body),
            headers: AssetsBrowserClient.headers
        })
        return FluxLibCore.createObservableFromFetch(request)
    }

    static renameFolder$(node: Nodes.FolderNode, newName: string) {

        let url = `${AssetsBrowserClient.urlBaseOrganization}/folders/${node.id}`
        let body = { "name": newName }
        let request = new Request(url, { method: 'POST', body: JSON.stringify(body), headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }

    static renameDrive$(node: Nodes.DriveNode, newName: string) {

        let url = `${AssetsBrowserClient.urlBaseOrganization}/drives/${node.driveId}`
        let body = { "name": newName }
        let request = new Request(url, { method: 'POST', body: JSON.stringify(body), headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }


    static renameAsset$(node: Nodes.ItemNode, newName: string) {

        let url = `${AssetsBrowserClient.urlBaseAssets}/${node.id}`
        let body = { "name": newName }
        let request = new Request(url, { method: 'POST', body: JSON.stringify(body), headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }

    static move$(target: Nodes.ItemNode | Nodes.FolderNode, folder: Nodes.FolderNode | Nodes.DriveNode) {

        let url = `${AssetsBrowserClient.urlBaseOrganization}/${target.id}/move`
        let body = { destinationFolderId: folder.id }

        let request = new Request(url, { method: 'POST', body: JSON.stringify(body), headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }

    static borrow$(target: Nodes.ItemNode | Nodes.FolderNode, folder: Nodes.FolderNode | Nodes.DriveNode) {

        let url = `${AssetsBrowserClient.urlBaseOrganization}/${target.id}/borrow`
        let body = { destinationFolderId: folder.id }

        let request = new Request(url, { method: 'POST', body: JSON.stringify(body), headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }


    static queryAssets$(query): Observable<Array<Asset>> {

        let url = AssetsBrowserClient.urlBaseAssets + "/query-tree"
        let request = new Request(url, { method: 'POST', body: JSON.stringify(query), headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request).pipe(
            map(({ assets }) => assets.map(asset => new Asset(asset)))
        )
    }

    static getAsset$(assetId: string): Observable<Asset> {
        let url = AssetsBrowserClient.urlBaseAssets + `/${assetId}`
        let request = new Request(url, { headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request).pipe(
            map((asset: any) => new Asset(asset))
        )
    }

    static updateAsset$(asset: Asset, attributesUpdate): Observable<Asset> {

        let body = Object.assign({}, asset, attributesUpdate)
        let url = AssetsBrowserClient.urlBaseAssets + `/${asset.assetId}`
        let request = new Request(url, { method: 'POST', body: JSON.stringify(body), headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request).pipe(
            map((asset: any) => new Asset(asset))
        )
    }

    static addPicture$(asset: Asset, picture) {

        var formData = new FormData();
        formData.append('file', picture.file, picture.id)
        let url = AssetsBrowserClient.urlBaseAssets + `/${asset.assetId}/images/${picture.id}`
        let request = new Request(url, { method: 'POST', body: formData, headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request).pipe(
            map((asset: any) => new Asset(asset))
        )
    }

    static removePicture$(asset: Asset, pictureId) {

        let url = AssetsBrowserClient.urlBaseAssets + `/${asset.assetId}/images/${pictureId}`
        let request = new Request(url, { method: 'DELETE', headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request).pipe(
            map((asset: any) => new Asset(asset))
        )
    }

    static exposeGroup$(node: Nodes.FolderNode, { groupId, name }) {

        let url = AssetsBrowserClient.urlBase + `/exposed-groups/groups`
        let body = { groupId: groupId, name: name, folderId: node.id }
        let request = new Request(url, { method: 'POST', body: JSON.stringify(body), headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }

    static package$(node: Nodes.DriveNode) {
        let url = `/api/assets-gateway/tree/drives/${node.driveId}/package`
        let request = new Request(url, { method: 'PUT', headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }


    static unpackage$(node: Nodes.ItemNode) {
        let url = `/api/assets-gateway/tree/items/${node.id}/unpack`
        let request = new Request(url, { method: 'PUT', headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }

    static statistics$(assetId, binsCount) {

        let url = `/api/assets-gateway/assets/${assetId}/statistics?bins_count=${binsCount}`
        let request = new Request(url, { headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }

    static permissions$(treeId: string) {

        let url = `/api/assets-gateway/tree/${treeId}/permissions`
        let request = new Request(url, { headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }

    static accessInfo$(assetId: string) {

        let url = `/api/assets-gateway/assets/${assetId}/access`
        let request = new Request(url, { headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }

    static updateAccess$(assetId: string, groupId: string, body) {

        let url = `/api/assets-gateway/assets/${assetId}/access/${groupId}`
        let request = new Request(url, { method: 'PUT', body: JSON.stringify(body), headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }

    static getDeletedChildren$(groupId: string, driveId: string) {

        let url = `/api/assets-gateway/tree/drives/${driveId}/deleted`
        let request = new Request(url, { headers: AssetsBrowserClient.headers })

        return FluxLibCore.createObservableFromFetch(request).pipe(
            map(({ items, folders }: { items: Array<any>, folders: Array<any> }) => {

                return [
                    ...folders.map((folder: any) => new Nodes.DeletedFolderNode({ id: folder.folderId, name: folder.name, driveId })),
                    ...items.map((item: any) => new Nodes.DeletedItemNode({ id: item.itemId, name: item.name, driveId, type: item.type }))
                ]
            })
        ) as Observable<Array<Nodes.BrowserNode>>

    }

    static getFolderChildren$(groupId: string, driveId: string, folderId: string) {

        let url = `/api/assets-gateway/tree/folders/${folderId}/children`
        let request = new Request(url, { headers: AssetsBrowserClient.headers })

        return FluxLibCore.createObservableFromFetch(request).pipe(
            map(({ items, folders }: { items: Array<any>, folders: Array<any> }) => {
                return AssetsBrowserClient.children(groupId, driveId, folderId, { items, folders })
            })
        ) as Observable<Array<Nodes.BrowserNode>>
    }

    static getDrivesChildren$(groupId: string) {

        let url = `/api/assets-gateway/tree/groups/${groupId}/drives`
        let request = new Request(url, { headers: AssetsBrowserClient.headers })

        return FluxLibCore.createObservableFromFetch(request).pipe(
            map(({ drives }) => {

                return drives.map((drive: Drive) => {
                    return new Nodes.DriveNode({
                        id: drive.driveId, groupId: groupId, name: drive.name, driveId: drive.driveId, icon: 'fas fa-hdd',
                        children: AssetsBrowserClient.getFolderChildren$(groupId, drive.driveId, drive.driveId)
                    })
                })
            })
        ) as Observable<Array<Nodes.BrowserNode>>
    }

    static getGroupsChildren$(pathParent = "") {

        let url = '/api/assets-gateway/groups'
        let request = new Request(url, { headers: AssetsBrowserClient.headers })
        let start$ = this.allGroups
            ? of(this.allGroups)
            : FluxLibCore.createObservableFromFetch(request).pipe(
                tap(({ groups }) => this.allGroups = groups),
                map(({ groups }) => groups)
            )
        return start$.pipe(
            map((groups: Array<{ id: string, path: string }>) => {

                let children = groups.filter(grp => {
                    if (pathParent == "")
                        return grp.path == "private" || grp.path == "/youwol-users"
                    return grp.path != pathParent && grp.path.includes(pathParent) && (grp.path.slice(pathParent.length).match(/\//g)).length == 1
                })
                    .map(({ id, path }) => {

                        return new Nodes.GroupNode({
                            id: id,
                            name: path == "private" ? "" : path.slice(pathParent.length + 1),
                            icon: path == "private" ? "fas fa-user" : "fas fa-users",
                            children: AssetsBrowserClient.getDrivesChildren$(id).pipe(
                                mergeMap((drives) => {
                                    let children$ = AssetsBrowserClient.getGroupsChildren$(path).pipe(
                                        map((grps: [Array<Nodes.BrowserNode>]) => [...grps, ...drives]))
                                    return children$ as Observable<Array<Nodes.BrowserNode>>
                                })
                            )
                        })
                    })
                return children
            })
        ) as Observable<Array<Nodes.BrowserNode>>
    }

    static dataPreview$(rawId: string): Observable<{ kind: string, content: string }> {
        let url = `/api/assets-gateway/raw/data/metadata/${rawId}/preview`
        let request = new Request(url, { headers: AssetsBrowserClient.headers })

        return FluxLibCore.createObservableFromFetch(request)
    }

    static getDataMetadata$(rawId: string) {
        let url = `/api/assets-gateway/raw/data/metadata/${rawId}`
        let request = new Request(url, { headers: AssetsBrowserClient.headers })

        return FluxLibCore.createObservableFromFetch(request)
    }

    static updateDataMetadata$(rawId, body) {

        let url = `/api/assets-gateway/raw/data/${rawId}/metadata`
        let request = new Request(url, { method: 'POST', body: JSON.stringify(body), headers: AssetsBrowserClient.headers })

        return FluxLibCore.createObservableFromFetch(request)
    }

    static fluxProjectAssets$() {
        let body = { whereClauses: [{ column: "kind", relation: 'eq', term: 'flux-project' }], maxResults: 100 }
        let requestFluxProject = new Request(`/api/assets-gateway/assets/query-flat`,
            { method: 'POST', body: JSON.stringify(body), headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(requestFluxProject)
    }

    static modulesBoxAssets$() {

        let body = { whereClauses: [{ column: "kind", relation: 'eq', term: 'package' }], maxResults: 100 }
        let requestFluxProject = new Request(`/api/assets-gateway/assets/query-flat`,
            { method: 'POST', body: JSON.stringify(body), headers: AssetsBrowserClient.headers })

        return FluxLibCore.createObservableFromFetch(requestFluxProject)
    }

    static importFluxProjects$(node: Nodes.FolderNode, assets: Array<Asset>) {

        let body = {
            groupId: node.groupId,
            folderId: node.id,
            assetIds: assets.map(asset => asset.assetId)
        }
        let request = new Request(`/api/assets-gateway/flux-projects/import`,
            { method: 'POST', body: JSON.stringify(body), headers: AssetsBrowserClient.headers })
        return FluxLibCore.createObservableFromFetch(request)
    }

    static getFluxProject$(rawId) {
        let request = new Request(`/api/assets-gateway/raw/flux-project/${rawId}`, { headers: AssetsBrowserClient.headers })

        return FluxLibCore.createObservableFromFetch(request)
    }

    static updateFluxProjectMetadata$(rawId: string, body) {

        let request = new Request(`/api/assets-gateway/raw/flux-project/${rawId}/metadata`,
            { method: 'POST', body: JSON.stringify(body), headers: AssetsBrowserClient.headers })

        return FluxLibCore.createObservableFromFetch(request)
    }

    static getPackageMetadata$(rawId: string) {

        let request = new Request(`/api/assets-gateway/raw/package/metadata/${rawId}`, { headers: AssetsBrowserClient.headers })

        return FluxLibCore.createObservableFromFetch(request)
    }

    static children(groupId, driveId, folderId, { items, folders }: { items: Array<any>, folders: Array<any> }) {

        return [
            ...folders.map((folder: Folder) => {
                return new Nodes.FolderNode({
                    id: folder.folderId, groupId, name: folder.name, driveId, parentFolderId: folderId,
                    children: AssetsBrowserClient.getFolderChildren$(groupId, driveId, folder.folderId)
                })
            }), ...items.map((item: Item) => {
                let assetData = {
                    id: item.treeId,
                    groupId,
                    driveId,
                    ...item
                }
                if (item.kind == "flux-project")
                    return new Nodes.FluxProjectNode(assetData)
                if (item.kind == "story")
                    return new Nodes.StoryNode(assetData)
                if (item.kind == "data")
                    return new Nodes.DataNode(assetData)
                if (item.kind == "package")
                    return new Nodes.FluxPackNode(assetData)
                throw Error("Unknown asset type")

            }), ...folderId == driveId
                ? [new Nodes.TrashNode({
                    id: 'trash_' + driveId, groupId: groupId, name: 'trash', driveId,
                    children: AssetsBrowserClient.getDeletedChildren$(groupId, driveId)
                })]
                : []
        ]
    }
}
