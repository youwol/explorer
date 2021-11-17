import { Observable, of } from 'rxjs'
import { map } from 'rxjs/operators'
import { AppState } from '../app.state'
import { AssetsBrowserClient } from '../assets-browser.client'
import { Nodes } from '../data'
import { modalExposeGroup } from './modal-expose-group.view'
//import { modalImportAssets } from './modal-import.view'


export interface Action {
    icon: string
    name: string,
    enable: boolean,
    exe: () => void,
    applicable: (BrowserNode, any) => boolean
}
let ALL_ACTIONS = {
    rename: (state: AppState, node: Nodes.BrowserNode) => ({
        icon: 'fas fa-pen', name: 'rename', enable: false,
        exe: () => { state.toggleRenaming(node) },
        applicable: (node, permissions) => {
            if (!permissions.write || node instanceof Nodes.TrashNode)
                return false
            if (node instanceof Nodes.ItemNode) {
                return !node.borrowed
            }
            return node instanceof Nodes.FolderNode || node instanceof Nodes.DriveNode
        }
    }),
    newFolder: (state: AppState, node: Nodes.FolderNode | Nodes.DriveNode) => ({
        icon: 'fas fa-folder', name: 'new folder', enable: false,
        exe: () => { state.newFolder(node as any) },
        applicable: (node, permissions) => (node instanceof Nodes.FolderNode || node instanceof Nodes.DriveNode)
            && permissions.write
    }),
    packageDrive: (state: AppState, node: Nodes.DriveNode) => ({
        icon: 'fas fa-archive', name: 'package archive', enable: false,
        exe: () => {
            state.package(node as any)
        },
        applicable: (node, permissions) => node instanceof Nodes.DriveNode && permissions.write
    }),
    unpackage: (state: AppState, node: Nodes.DriveNode) => ({
        icon: 'fas fa-archive', name: 'unpackage archive', enable: false,
        exe: () => {
            state.unpackage(node as any)
        },
        applicable: (node, permissions) => node instanceof Nodes.DataNode && node.name.includes("drive-pack")
            && permissions.write
    }),
    download: (state: AppState, node: Nodes.DriveNode) => ({
        icon: 'fas fa-download', name: 'download file', enable: false,
        exe: () => {
            let nodeData = node as Nodes.DataNode
            let anchor = document.createElement('a') as HTMLAnchorElement
            anchor.setAttribute("href", `/api/assets-gateway/raw/data/${nodeData.relatedId}`)
            anchor.setAttribute("download", nodeData.name)
            anchor.dispatchEvent(new MouseEvent('click'))
            anchor.remove()
        },
        applicable: (node, permissions) => node instanceof Nodes.DataNode && permissions.write
    }),
    deleteFolder: (state: AppState, node: Nodes.FolderNode) => ({
        icon: 'fas fa-trash', name: 'delete', enable: false,
        exe: () => { state.deleteFolder(node as any) },
        applicable: (node, permissions) => node instanceof Nodes.FolderNode && permissions.write
    }),
    clearTrash: (state: AppState, node: Nodes.TrashNode) => ({
        icon: 'fas fa-times', name: 'clear trash', enable: false,
        exe: () => { state.purgeDrive(node as any) },
        applicable: (node, permissions) => node instanceof Nodes.TrashNode && permissions.write
    }),
    /*importAssets: (state: BrowserState, node: Nodes.FolderNode) => ({
        icon: 'fas fa-file-import', name: 'import asset', enable: false,
        exe: () => { 
            let modalView = modalImportAssets(state, node as Nodes.FolderNode)
            document.querySelector("body").appendChild(modalView.render()) 
        },
        applicable: (node, permissions) => node instanceof Nodes.FolderNode && permissions.write
    }),*/
    newFluxProject: (state: AppState, node: Nodes.FolderNode) => ({
        icon: 'fas fa-play', name: 'new app', enable: false,
        exe: () => { state.newFluxProject(node as any) },
        applicable: (node, permissions) => node instanceof Nodes.FolderNode && permissions.write
    }),
    newStory: (state: AppState, node: Nodes.FolderNode) => ({
        icon: 'fas fa-book', name: 'new story', enable: false,
        exe: () => { state.newStory(node as any) },
        applicable: (node, permissions) => node instanceof Nodes.FolderNode && permissions.write
    }),
    paste: (state: AppState, node: Nodes.FolderNode) => ({
        icon: 'fas fa-paste', name: 'paste', enable: true,
        exe: () => { state.pasteItem(node as Nodes.FolderNode) },
        applicable: (node, permissions) => node instanceof Nodes.FolderNode && permissions.write
    }),
    cut: (state: AppState, node: Nodes.FolderNode) => ({
        icon: 'fas fa-cut', name: 'cut', enable: false,
        exe: () => { state.cutItem(node as (Nodes.ItemNode | Nodes.FolderNode)) },
        applicable: (node, permissions) => {
            if (!permissions.write)
                return false
            if (node instanceof Nodes.ItemNode)
                return !node.borrowed

            return node instanceof Nodes.FolderNode
        }
    }),
    viewPresentationGroup: (state: AppState, node: Nodes.ExposedGroupNode) => ({
        icon: 'fas fa-play', name: 'navigate to presentation', enable: true,
        exe: () => { },
        applicable: (node, permissions) => node instanceof Nodes.ExposedGroupNode && permissions.read
    }),
    importData: (state: AppState, node: Nodes.FolderNode) => ({
        icon: 'fas fa-file-import', name: 'import data', enable: false,
        exe: () => {
            let input = document.createElement('input') as HTMLInputElement
            input.setAttribute("type", "file")
            input.setAttribute("multiple", "true")
            input.dispatchEvent(new MouseEvent('click'))
            input.onchange = (ev) => {
                state.uploadFiles(node, input)
                input.remove()
            }
        },
        applicable: (node, permissions) => node instanceof Nodes.FolderNode || node instanceof Nodes.DriveNode
            && permissions.write
    }),
    deleteItem: (state: AppState, node: Nodes.ItemNode) => ({
        icon: 'fas fa-trash', name: 'delete', enable: false,
        exe: () => { state.deleteItem(node) },
        applicable: (node, permissions) => node instanceof Nodes.ItemNode && permissions.write
    }),
    newDrive: (state: AppState, node: Nodes.GroupNode) => ({
        icon: 'fas fa-drive', name: 'new drive', enable: false,
        exe: () => { state.newDrive(node) },
        applicable: (node, permissions) => node instanceof Nodes.GroupNode && permissions.write
    }),
    deleteDrive: (state: AppState, node: Nodes.DriveNode) => ({
        icon: 'fas fa-trash', name: 'delete', enable: false,
        exe: () => { state.deleteDrive(node) },
        applicable: (node, permissions) => node instanceof Nodes.DriveNode && permissions.write
    }),
    addPackage: (state: AppState, node: Nodes.FolderNode) => ({
        icon: 'fas fa-box', name: 'add package', enable: true,
        exe: () => {
            let input = document.createElement('input') as HTMLInputElement
            input.setAttribute("type", "file")
            input.dispatchEvent(new MouseEvent('click'))
            input.onchange = (ev) => {
                state.addPackage(node, input)
                input.remove()
            }
        },
        applicable: (node, permissions) => node instanceof Nodes.FolderNode && permissions.write
    }),
    exposeGroup: (state: AppState, node: Nodes.FolderNode) => ({
        icon: 'fas fa-users', name: 'advertise group', enable: true,
        exe: () => {
            let modalView = modalExposeGroup(state, node)
            document.querySelector("body").appendChild(modalView)
        },
        applicable: (node, permissions) => node instanceof Nodes.FolderNode && permissions.write
    }),
    borrow: (state: AppState, node: Nodes.ItemNode) => ({
        icon: 'fas fa-download', name: 'borrow item', enable: true,
        exe: () => {
            state.borrowItem(node)
        },
        applicable: (node, permissions) => {
            if (!permissions.share)
                return false

            return node instanceof Nodes.ItemNode
        }
    }),
    copyFileIdInClipboard: (state: AppState, node: Nodes.DataNode) => ({
        icon: 'fas fa-copy', name: 'copy fileId in clipboard', enable: true,
        exe: () => {
            navigator.clipboard.writeText(node.id).then(function () {
                console.log('Async: Copying to clipboard was successful!');
            })
        },
        applicable: (node, permissions) => node instanceof Nodes.DataNode && permissions.read
    }),
    favorite: (state: AppState, node: Nodes.ItemNode) => ({
        icon: 'fas fa-star', name: 'add to favorite bar', enable: true,
        exe: () => { state.addFavorite(node as any) },
        applicable: (node, permissions) => node instanceof Nodes.ItemNode
    }),
}


export function getActions$(state: AppState, node: Nodes.BrowserNode): Observable<Array<Action>> {

    if (node instanceof Nodes.DeletedNode)
        return of([]) // restore at some point

    if (node instanceof Nodes.GroupNode) {
        // a service should return permissions of the current user for the group
        // for now, everybody can do everything
        let actions = Object.values(ALL_ACTIONS).map(
            action => action(state, node as any)
        )
            .filter(a => a.applicable(node, { read: true, write: true, share: true }))
        return of(actions)
    }


    return AssetsBrowserClient.permissions$(node instanceof Nodes.TrashNode ? node.driveId : node.id)
        .pipe(
            map(permissions => ({ state, node, permissions })),
            map(({ state, node, permissions }) => {
                return Object.values(ALL_ACTIONS).map(
                    action => action(state, node as any)
                )
                    .filter(a => a.applicable(node, permissions))
            })
        )
}
