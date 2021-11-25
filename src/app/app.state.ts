import { uuidv4 } from '@youwol/flux-core'
import { BehaviorSubject, combineLatest, from, Observable, of, ReplaySubject } from "rxjs"
import { distinctUntilChanged, filter, map, mergeMap, share, shareReplay, tap } from 'rxjs/operators'
import { AssetsBrowserClient } from './assets-browser.client'
import { YouwolBannerState } from "@youwol/flux-youwol-essentials"
import { install } from '@youwol/cdn-client'
import { ImmutableTree } from '@youwol/fv-tree'
import { FluxState } from './specific-assets/flux/flux.state'
import { RunningApp } from './views/main-panel/running-app.view'
import { StoryState } from './specific-assets/story/story.state'
import { DataState } from './specific-assets/data/data.state'
import { VirtualDOM } from '@youwol/flux-view'
import { AnyFolderNode, AnyItemNode, BrowserNode, DownloadNode, DriveNode, FolderNode, FutureNode, GroupNode, HomeNode, ItemNode, TrashNode } from './nodes'



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

export type SelectedItem = { node: BrowserNode, selection: 'direct' | 'indirect' }

export class TreeGroup extends ImmutableTree.State<BrowserNode> {

    public readonly homeFolderId: string
    public readonly trashFolderId: string
    public readonly defaultDriveId: string
    public readonly drivesId: string
    public readonly downloadFolderId?: string
    public readonly recentId?: string

    constructor(rootNode: GroupNode, params: {
        homeFolderId: string
        trashFolderId: string
        defaultDriveId: string
        drivesId: string
        downloadFolderId?: string
        recentId?: string
    }) {
        super({ rootNode, expandedNodes: [rootNode.id] })
        Object.assign(this, params)
    }

    getHomeNode(): HomeNode {
        return this.getNode(this.homeFolderId)
    }
    getDownloadNode(): DownloadNode {
        return this.getNode(this.downloadFolderId)
    }
    getTrashNode(): TrashNode {
        return this.getNode(this.trashFolderId)
    }
}

function createTreeGroup(groupName: string, respUserDrives, respDefaultDrive) {

    let homeFolderNode = new FolderNode<'home'>({
        kind: 'home',
        folderId: respDefaultDrive.homeFolderId,
        groupId: respDefaultDrive.groupId,
        parentFolderId: respDefaultDrive.driveId,
        driveId: respDefaultDrive.driveId,
        name: respDefaultDrive.homeFolderName,
        children: AssetsBrowserClient.getFolderChildren$(respDefaultDrive.groupId, respDefaultDrive.driveId, respDefaultDrive.homeFolderId)
    })
    let downloadFolderNode = new FolderNode<'download'>({
        kind: 'download',
        folderId: respDefaultDrive.downloadFolderId,
        groupId: respDefaultDrive.groupId,
        parentFolderId: respDefaultDrive.driveId,
        driveId: respDefaultDrive.driveId,
        name: respDefaultDrive.downloadFolderName,
        children: AssetsBrowserClient.getFolderChildren$(respDefaultDrive.groupId, respDefaultDrive.driveId, respDefaultDrive.downloadFolderId)
    })
    let trashFolderNode = new FolderNode<'trash'>({
        kind: 'trash',
        folderId: 'trash',
        parentFolderId: respDefaultDrive.driveId,
        groupId: respDefaultDrive.groupId,
        driveId: respDefaultDrive.driveId,
        name: 'Trash',
        children: AssetsBrowserClient.getDeletedChildren$(respDefaultDrive.groupId, respDefaultDrive.driveId)
    })
    let defaultDrive = new DriveNode({
        groupId: respDefaultDrive.groupId,
        driveId: respDefaultDrive.driveId,
        name: respDefaultDrive.driveName,
        children: [homeFolderNode, downloadFolderNode, trashFolderNode]
    })
    let userDrives = respUserDrives
        .filter(drive => drive.id != defaultDrive.id)
        .map((drive) => {
            return new DriveNode({
                groupId: drive.groupId,
                driveId: drive.driveId,
                name: drive.name,
                children: AssetsBrowserClient.getFolderChildren$(drive.groupId, drive.driveId, drive.driveId)
            })
        })
    let userGroup = new GroupNode({
        id: respDefaultDrive.groupId,
        name: groupName,
        children: [defaultDrive, ...userDrives],
        kind: 'user'
    })

    return new TreeGroup(userGroup, {
        homeFolderId: homeFolderNode.id,
        trashFolderId: trashFolderNode.id,
        defaultDriveId: defaultDrive.id,
        drivesId: userDrives.map(d => d.id),
        downloadFolderId: downloadFolderNode.id
    })
}


export class AppState {

    public flux: FluxState
    public story: StoryState
    public data: DataState

    public readonly topBannerState = new YouwolBannerState({ cmEditorModule$: fetchCodeMirror$() })

    public readonly selectedItem$ = new ReplaySubject<BrowserNode>(1)

    public readonly openFolder$ = new ReplaySubject<{ tree: TreeGroup, folder: BrowserNode }>(1)

    public readonly currentFolder$ = this.openFolder$.pipe(
        filter(({ folder }) => folder.children != undefined
        ),
        mergeMap(({ tree, folder }) => {
            tree.getChildren(folder)
            return tree.getChildren$(folder).pipe(map(() => ({ tree, folder })))
        }),
        distinctUntilChanged((a, b) => a.folder.id == b.folder.id),
        shareReplay(1)
    ) as Observable<{ tree: TreeGroup, folder: FolderNode<any> }>

    //public readonly viewMode$ = new BehaviorSubject<'navigation' | RunningApp>('navigation')

    public readonly runningApplication$ = new BehaviorSubject<RunningApp>(undefined)
    public readonly runningApplications$ = new BehaviorSubject<RunningApp[]>([])

    public readonly userInfo$ = AssetsBrowserClient.getUserInfo$().pipe(
        share()
    )

    public readonly defaultUserDrive$ = this.userInfo$.pipe(
        mergeMap(({ groups }) => {
            let privateGrp = groups.find(grp => grp.path == 'private')
            return AssetsBrowserClient.getDefaultDrive$(privateGrp.id)
        }),
        share()
    )

    public readonly userDrives$ = this.userInfo$.pipe(
        mergeMap(({ groups }) => {
            let privateGrp = groups.find(grp => grp.path == 'private')
            return AssetsBrowserClient.getDrivesChildren$(privateGrp.id)
        })
    )

    groupsTree: { [key: string]: TreeGroup } = {}

    public itemCut: {
        cutType: 'borrow' | 'move',
        node: ItemNode<any> | FolderNode<any>
    }

    constructor() {

        combineLatest([
            this.userDrives$,
            this.defaultUserDrive$
        ]).subscribe(([respUserDrives, respDefaultDrive]: [any, any]) => {

            let tree = createTreeGroup('You', respUserDrives, respDefaultDrive)
            this.groupsTree[respDefaultDrive.groupId] = tree
            this.flux = new FluxState(tree)
            this.story = new StoryState(tree)
            this.data = new DataState(tree)
            this.openFolder(tree.getHomeNode())
            tree.directUpdates$.subscribe((updates) => {
                updates.forEach(update => AssetsBrowserClient.execute(update))
            })
        })
        window['@youwol/os'] = this
        this.createInstance({
            icon: "fas fa-shopping-cart",
            title: "Exhibition halls",
            appURL: `/ui/exhibition-halls/`
        })
    }

    openFolder(folder: FolderNode<any> | DriveNode) {
        this.openFolder$.next({ tree: this.groupsTree[folder.groupId], folder })
    }

    selectItem(item: BrowserNode) {
        this.selectedItem$.next(item)
    }

    selectGroup(group) {
        combineLatest([
            AssetsBrowserClient.getDefaultDrive$(group.id),
            AssetsBrowserClient.getDrivesChildren$(group.id)
        ]).subscribe(([defaultDrive, drives]: [any, any]) => {
            let tree = createTreeGroup(group.elements.slice(-1)[0], drives, defaultDrive)
            this.groupsTree[defaultDrive.groupId] = tree
            this.openFolder(tree.getHomeNode())
        })
    }

    newFolder(parentNode: DriveNode | FolderNode<any>) {

        let tree = this.groupsTree[parentNode.groupId]
        let childFolder = new FutureNode({
            icon: 'fas fa-folder',
            name: 'new folder',
            onResponse: (resp) => {
                let folderNode = new FolderNode({
                    kind: 'regular',
                    groupId: parentNode.groupId,
                    driveId: parentNode.driveId,
                    name: 'new folder',
                    folderId: resp.folderId,
                    parentFolderId: parentNode.id,
                    children: []
                })
                tree.replaceNode(childFolder.id, folderNode)
            },
            request: AssetsBrowserClient.newFolder$(parentNode, { name: 'new folder', folderId: uuidv4() })
        })
        tree.addChild(parentNode.id, childFolder)
    }

    createInstance(appData: {
        icon: string,
        title: string,
        appURL: string
    }) {
        let instanceId = uuidv4()
        let url = appData.appURL.endsWith('/')
            ? appData.appURL + "?instance-id=" + instanceId
            : appData.appURL + "&instance-id=" + instanceId
        let app = new RunningApp({
            state: this,
            instanceId,
            icon: appData.icon,
            title: appData.title,
            appURL$: of(url)
        })
        this.runningApplications$.next([...this.runningApplications$.getValue(), app])
        return app
    }


    focus(app: RunningApp) {
        this.runningApplication$.next(app)
    }

    toggleNavigationMode() {
        this.runningApplication$.next(undefined)
    }

    setTopBannerViews(appId: string, { actionsView, badgesView }: { actionsView: VirtualDOM, badgesView: VirtualDOM }) {
        let app = this.runningApplications$.getValue().find(app => app.instanceId === appId)
        app.topBannerActions$.next(actionsView)
    }

    close(app: RunningApp) {
        app.terminateInstance()
        this.runningApplications$.next(this.runningApplications$.getValue().filter(d => d != app))
        this.runningApplication$.next(undefined)
    }

    minimize(preview: RunningApp) {

        this.runningApplication$.next(undefined)
        if (this.runningApplications$.getValue().includes(preview))
            return
        this.runningApplications$.next([...this.runningApplications$.getValue(), preview])
    }

    rename(node: FolderNode<'regular'> | AnyItemNode, newName: string, save: boolean = true) {

        node.removeStatus({ type: 'renaming' })
        this.groupsTree[node.groupId].replaceAttributes(node, { name: newName }, true, () => ({}), { toBeSaved: save })
    }

    deleteFolder(node: FolderNode<'regular'>) {
        this.groupsTree[node.groupId].removeNode(node)
    }

    deleteItem(node: AnyItemNode) {
        this.groupsTree[node.groupId].removeNode(node)
    }

    purgeDrive(trashNode: TrashNode) {

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



