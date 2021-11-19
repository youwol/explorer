import { uuidv4 } from '@youwol/flux-core'
import { BehaviorSubject, combineLatest, from, Observable, ReplaySubject, Subject } from "rxjs"
import { distinctUntilChanged, filter, map, mergeMap, share, shareReplay, tap } from 'rxjs/operators'
import { AssetsBrowserClient } from './assets-browser.client'
import { Asset, Nodes, UploadStep } from './data'
import { YouwolBannerState } from "@youwol/flux-youwol-essentials"
import { install } from '@youwol/cdn-client'
import { ImmutableTree } from '@youwol/fv-tree'
import { FluxState } from './specific-assets/flux/flux.state'
import { RunningApp } from './views/main-panel/running-app.view'
import { StoryState } from './specific-assets/story/story.state'
import { Action, ActionConstructor } from './actions.factory'
import { DataState } from './specific-assets/data/data.state'
import { MarketplaceApp } from './views/market-place/market-place.view'



function fetchCodeMirror$(): Observable<any> {

    return from(
        install({
            modules: ['codemirror'],
            scripts: [
                "codemirror#5.52.0~mode/javascript.min.js"
            ],
            css: [
                "codemirror#5.52.0~codemirror.min.css",
                "codemirror#5.52.0~theme/blackboard.min.css"
            ]
        })
    )
}

const fileTypes = [
    "image/apng",
    "image/bmp",
    "image/gif",
    "image/jpeg",
    "image/pjpeg",
    "image/png",
    "image/svg+xml",
    "image/tiff",
    "image/webp",
    "image/x-icon"
];

function validFileType(file) {
    return fileTypes.includes(file.type);
}

export type SelectedItem = { node: Nodes.BrowserNode, selection: 'direct' | 'indirect' }

export class TreeGroup extends ImmutableTree.State<Nodes.BrowserNode> {

    constructor({ rootNode }: { rootNode: Nodes.BrowserNode }) {
        super({ rootNode, expandedNodes: [rootNode.id] })
    }
}

export class AppState {

    public flux: FluxState
    public story: StoryState
    public data: DataState
    public allStates: { NodeType, getApp, actions }[]
    public specificActions: ActionConstructor[]

    public readonly topBannerState = new YouwolBannerState({ cmEditorModule$: fetchCodeMirror$() })

    public readonly selectedItem$ = new ReplaySubject<Nodes.BrowserNode>(1)

    public readonly openFolder$ = new ReplaySubject<Nodes.BrowserNode>(1)
    public readonly currentFolder$ = this.openFolder$.pipe(
        tap((folder) => console.log("Folder is open", { folder, tree: this.userTree })),
        filter((selection) => selection.children != undefined
        ),
        mergeMap((folder) => {
            this.userTree.getChildren(folder)
            return this.userTree.getChildren$(folder).pipe(map(() => folder))
        }),
        distinctUntilChanged((a, b) => a.id == b.id),
        shareReplay(1)
    ) as Observable<Nodes.FolderNode>

    public readonly viewMode$ = new BehaviorSubject<'navigation' | RunningApp>('navigation')

    public readonly runningApplications$ = new BehaviorSubject<RunningApp[]>([new MarketplaceApp({})])

    public readonly userInfo$ = AssetsBrowserClient.getUserInfo$().pipe(
        share()
    )
    public readonly defaultDrive$ = AssetsBrowserClient.getDefaultDrive$().pipe(
        share()
    )
    public readonly userDrives$ = this.userInfo$.pipe(
        mergeMap(({ groups }) => {
            let privateGrp = groups.find(grp => grp.path == 'private')
            return AssetsBrowserClient.getDrivesChildren$(privateGrp.id)
        })
    )

    userTree: TreeState

    homeFolderNode: Nodes.HomeNode
    downloadFolderNode: Nodes.DownloadNode
    trashFolderNode: Nodes.TrashNode
    recentNode = new Nodes.RecentNode({ name: 'Recent' })

    constructor() {

        combineLatest([
            this.userDrives$,
            this.defaultDrive$
        ]).subscribe(([respUserDrives, respDefaultDrive]: [any, any]) => {

            this.homeFolderNode = new Nodes.HomeNode({
                id: respDefaultDrive.homeFolderId,
                groupId: respDefaultDrive.groupId,
                parentFolderId: respDefaultDrive.driveId,
                driveId: respDefaultDrive.driveId,
                name: respDefaultDrive.homeFolderName,
                children: AssetsBrowserClient.getFolderChildren$(respDefaultDrive.groupId, respDefaultDrive.driveId, respDefaultDrive.homeFolderId)
            })
            this.downloadFolderNode = new Nodes.DownloadNode({
                id: respDefaultDrive.downloadFolderId,
                groupId: respDefaultDrive.groupId,
                parentFolderId: respDefaultDrive.driveId,
                driveId: respDefaultDrive.driveId,
                name: respDefaultDrive.downloadFolderName,
                children: AssetsBrowserClient.getFolderChildren$(respDefaultDrive.groupId, respDefaultDrive.driveId, respDefaultDrive.downloadFolderId)
            })
            this.trashFolderNode = new Nodes.TrashNode({
                id: 'trash',
                groupId: respDefaultDrive.groupId,
                driveId: respDefaultDrive.driveId,
                name: 'Trash',
                children: AssetsBrowserClient.getDeletedChildren$(respDefaultDrive.groupId, respDefaultDrive.driveId)
            })
            let defaultDrive = new Nodes.DriveNode({
                icon: 'fas fa-hdd',
                id: respDefaultDrive.driveId,
                groupId: respDefaultDrive.groupId,
                driveId: respDefaultDrive.driveId,
                name: respDefaultDrive.driveName,
                children: [this.homeFolderNode, this.downloadFolderNode, this.trashFolderNode]
            })
            let userDrives = respUserDrives
                .filter(drive => drive.id != defaultDrive.id)
                .map((drive) => {
                    return new Nodes.DriveNode({
                        icon: 'fas fa-hdd',
                        id: drive.driveId,
                        groupId: drive.groupId,
                        driveId: drive.driveId,
                        name: drive.name,
                        children: AssetsBrowserClient.getFolderChildren$(drive.groupId, drive.driveId, drive.driveId)
                    })
                })
            let userGroup = new Nodes.GroupNode({
                id: respDefaultDrive.groupId,
                name: "You",
                children: [defaultDrive, ...userDrives],
                icon: 'fas fa-user'
            })

            this.userTree = new TreeState({
                rootNode: userGroup
            })

            this.flux = new FluxState(this.userTree)
            this.story = new StoryState(this.userTree)
            this.data = new DataState(this.userTree)
            this.allStates = [this.flux, this.story, this.data]
            this.specificActions = this.allStates.map(s => s.actions).flat()
            this.openFolder(this.homeFolderNode)
            this.userTree.directUpdates$.subscribe((updates) => {
                updates.forEach(update => AssetsBrowserClient.execute(update))
            })
        })
    }

    toggleNavigationMode() {
        this.viewMode$.next('navigation')
    }

    openFolder(folder: Nodes.BrowserNode) {
        this.openFolder$.next(folder)
    }

    selectItem(item: Nodes.BrowserNode) {
        this.selectedItem$.next(item)
    }

    newFolder(parentNode: Nodes.DriveNode | Nodes.FolderNode) {

        let childFolder = new Nodes.FutureNode({
            icon: 'fas fa-folder',
            name: 'new folder',
            onResponse: (resp) => {
                let folderNode = new Nodes.FolderNode({
                    groupId: parentNode.groupId,
                    driveId: parentNode.driveId,
                    name: 'new folder',
                    id: resp.folderId,
                    parentFolderId: parentNode.id,
                    children: []
                } as any)
                this.userTree.replaceNode(childFolder.id, folderNode)
            },
            request: AssetsBrowserClient.newFolder$(parentNode, { name: 'new folder', folderId: uuidv4() })
        })
        this.userTree.addChild(parentNode.id, childFolder)
    }

    run(preview: RunningApp) {
        this.viewMode$.next(preview)
    }

    close(preview: RunningApp) {
        this.runningApplications$.next(this.runningApplications$.getValue().filter(d => d != preview))
        this.viewMode$.next('navigation')
    }

    persistApplication(preview: RunningApp) {
        if (this.runningApplications$.getValue().includes(preview))
            return
        this.runningApplications$.next([...this.runningApplications$.getValue(), preview])
    }

    rename(node: Nodes.FolderNode | Nodes.ItemNode, newName: string) {

        node.removeStatus({ type: 'renaming' })
        this.userTree.replaceAttributes(node, { name: newName })
    }

    deleteFolder(node: Nodes.FolderNode) {
        this.userTree.removeNode(node)
    }

    deleteItem(node: Nodes.ItemNode) {
        this.userTree.removeNode(node)
    }

    purgeDrive(trashNode: Nodes.TrashNode) {

        AssetsBrowserClient.purgeDrive$(trashNode.driveId).pipe(
            mergeMap(() => {
                let tree = this.groupsTree[trashNode.groupId]
                return tree.getTrashNode().resolveChildren()
            })
        ).subscribe((children) => {

            children.forEach((deletedNode, i) => {
                this.groupsTree[trashNode.groupId].removeNode(deletedNode, i == children.length - 1)
            })
        })
    }

}



