import { delay, map } from 'rxjs/operators';
import { AnyFolderNode, AnyItemNode, BrowserNode, DeletedFolderNode, DeletedItemNode, DriveNode, FolderNode, FutureNode, ItemNode, RegularFolderNode } from './nodes';

import { uuidv4 } from '@youwol/flux-core';
import { ImmutableTree } from "@youwol/fv-tree";
import { Asset, AssetsGatewayClient } from '@youwol/flux-youwol-essentials';
import { Observable } from 'rxjs';

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
export let debugDelay = 0

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
    renameFolder: (update: ImmutableTree.Updates<BrowserNode>) => ({
        when: () => {
            if (!(
                update.command instanceof ImmutableTree.ReplaceAttributesCommand
                && update.addedNodes.length == 1
                && update.addedNodes[0] instanceof FolderNode
            ))
                return false
            let node = update.addedNodes[0] as AnyFolderNode
            return node.kind == 'regular'
        },
        then: () => {
            let node = update.addedNodes[0] as RegularFolderNode
            let uid = uuidv4()
            node.addStatus({ type: 'request-pending', id: uid })
            AssetsBrowserClient.renameFolder(node.id, node.name).pipe(
                delay(debugDelay)
            )
                .subscribe((resp: Folder) => {
                    node.removeStatus({ type: 'request-pending', id: uid })
                })
        }
    }),
    renameItem: (update: ImmutableTree.Updates<BrowserNode>) => ({
        when: () => {
            return update.command instanceof ImmutableTree.ReplaceAttributesCommand
                && update.addedNodes.length == 1
                && update.addedNodes[0] instanceof ItemNode
        },
        then: () => {
            let node = update.addedNodes[0] as AnyItemNode
            let cmd = update.command as ImmutableTree.ReplaceAttributesCommand<AnyItemNode>
            if (!cmd.metadata.toBeSaved) {
                return
            }
            let uid = uuidv4()
            node.addStatus({ type: 'request-pending', id: uid })
            AssetsBrowserClient.renameItem(node.id, node.name).pipe(
                delay(debugDelay)
            )
                .subscribe(() => {
                    node.removeStatus({ type: 'request-pending', id: uid })
                })
        }
    }),
    deleteFolder: (update: ImmutableTree.Updates<BrowserNode>) => ({
        when: () => {
            if (!(update.command instanceof ImmutableTree.RemoveNodeCommand) ||
                update.removedNodes.length !== 1
            )
                return false
            let node = update.removedNodes[0]
            if (!(node instanceof FolderNode))
                return false
            return node.kind === 'regular'
        },
        then: () => {
            let node = update.removedNodes[0] as FolderNode<'regular'>
            let cmd = update.command as ImmutableTree.RemoveNodeCommand<FolderNode<'regular'>>
            let parent = cmd.parentNode
            let uid = uuidv4()
            parent.addStatus({ type: 'request-pending', id: uid })
            AssetsBrowserClient.deleteFolder(node).pipe(
                delay(debugDelay)
            )
                .subscribe(() => {
                    parent.removeStatus({ type: 'request-pending', id: uid })
                })
        }
    }),
    deleteItem: (update: ImmutableTree.Updates<BrowserNode>) => ({
        when: () => {
            return update.command instanceof ImmutableTree.RemoveNodeCommand
                && update.removedNodes.length == 1
                && update.removedNodes[0] instanceof ItemNode
        },
        then: () => {
            let node = update.removedNodes[0] as AnyItemNode
            let cmd = update.command as ImmutableTree.RemoveNodeCommand<AnyItemNode>
            let parent = cmd.parentNode
            let uid = uuidv4()
            parent.addStatus({ type: 'request-pending', id: uid })
            AssetsBrowserClient.deleteItem(node).pipe(
                delay(debugDelay)
            )
                .subscribe(() => {
                    parent.removeStatus({ type: 'request-pending', id: uid })
                })
        }
    }),
    newAsset: (update: ImmutableTree.Updates<BrowserNode>) => ({
        when: () => {
            return update.command instanceof ImmutableTree.AddChildCommand
                && update.addedNodes.length == 1
                && update.addedNodes[0] instanceof FutureNode
        },
        then: () => {
            let node = update.addedNodes[0] as FutureNode
            let cmd = update.command as ImmutableTree.AddChildCommand<BrowserNode>
            let parentNode = cmd.parentNode as AnyFolderNode
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

    static assetsGtwClient = new AssetsGatewayClient()

    static execute(update: ImmutableTree.Updates<BrowserNode>) {

        let command = Object.values(databaseActionsFactory)
            .map(actionFactory => actionFactory(update))
            .find(action => action.when())
        console.log("Execute command", { update, command })
        command && command.then()
    }

    static renameFolder(folderId: string, newName: string) {
        return AssetsBrowserClient.assetsGtwClient.renameFolder(folderId, newName)
    }

    static renameItem(itemId: string, newName: string) {
        return AssetsBrowserClient.assetsGtwClient.renameItem(itemId, newName)
    }

    static deleteItem(node: AnyItemNode) {
        return AssetsBrowserClient.assetsGtwClient.deleteItem(node.driveId, node.treeId)
    }

    static deleteFolder(node: RegularFolderNode) {
        return AssetsBrowserClient.assetsGtwClient.deleteFolder(node.folderId)
    }

    static getUserInfo() {
        return AssetsBrowserClient.assetsGtwClient.getUserInfo()
    }

    static getDefaultDrive(groupId: string) {
        return AssetsBrowserClient.assetsGtwClient.getDefaultDrive(groupId)
    }

    static purgeDrive(driveId: string) {
        return AssetsBrowserClient.assetsGtwClient.purgeDrive(driveId)
    }

    static newFolder(node: DriveNode | AnyFolderNode, body: { name: string, folderId: string }) {

        return AssetsBrowserClient.assetsGtwClient.newFolder(node.id, body)
    }

    static getDeletedChildren(groupId: string, driveId: string) {

        return AssetsBrowserClient.assetsGtwClient.getDeletedChildren(groupId, driveId).pipe(
            map(({ items, folders }: { items: Array<any>, folders: Array<any> }) => {

                return [
                    ...folders.map((folder: any) => new DeletedFolderNode({ id: folder.folderId, name: folder.name, driveId })),
                    ...items.map((item: any) => new DeletedItemNode({ id: item.itemId, name: item.name, driveId, type: item.type }))
                ]
            })
        ) as Observable<Array<BrowserNode>>
    }

    static getFolderChildren(groupId: string, driveId: string, folderId: string) {

        return AssetsBrowserClient.assetsGtwClient.getFolderChildren(groupId, driveId, folderId).pipe(
            map(({ items, folders }: { items: Array<any>, folders: Array<any> }) => {

                return [
                    ...folders.map((folder: Folder) => {
                        return new FolderNode({
                            folderId: folder.folderId, kind: 'regular', groupId, name: folder.name, driveId, parentFolderId: folderId,
                            children: AssetsBrowserClient.getFolderChildren(groupId, driveId, folder.folderId)
                        })
                    }),
                    ...items.map((item: Item) => {
                        let assetData = {
                            id: item.treeId,
                            groupId,
                            driveId,
                            ...item
                        }
                        return new ItemNode(assetData as any)
                    })
                ]
            })
        ) as Observable<Array<BrowserNode>>
    }

    static getDrivesChildren(groupId: string) {

        return AssetsBrowserClient.assetsGtwClient.getDrives(groupId).pipe(
            map(({ drives }) => {
                return drives.map((drive: Drive) => {
                    return new DriveNode({
                        groupId: groupId, name: drive.name, driveId: drive.driveId,
                        children: AssetsBrowserClient.getFolderChildren(groupId, drive.driveId, drive.driveId)
                    })
                })
            })
        ) as Observable<Array<DriveNode>>
    }

    static getAsset$(assetId: string): Observable<Asset> {
        return AssetsBrowserClient.assetsGtwClient.getAsset$(assetId)
    }

}
