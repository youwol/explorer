import { uuidv4 } from '@youwol/flux-core'
import { BehaviorSubject, from, Observable, ReplaySubject, Subject } from "rxjs"
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

export class TreeState extends ImmutableTree.State<Nodes.BrowserNode> {

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
    public readonly selectedDrive$ = new Subject<Nodes.DriveNode>()
    public readonly selectedItem$ = new ReplaySubject<Nodes.BrowserNode>(1)

    public readonly openFolder$ = new ReplaySubject<Nodes.BrowserNode>(1)
    public readonly currentFolder$ = this.openFolder$.pipe(
        tap((f) => console.log("Folder is open", f)),
        filter((selection) => selection instanceof Nodes.FolderNode),
        mergeMap((folder) => {
            this.homeTreeState.getChildren(folder)
            return this.homeTreeState.getChildren$(folder).pipe(map(() => folder))
        }),
        distinctUntilChanged((a, b) => a.id == b.id),
        shareReplay(1)
    ) as Observable<Nodes.FolderNode>

    public readonly viewMode$ = new BehaviorSubject<'navigation' | RunningApp>('navigation')

    public readonly runningApplications$ = new BehaviorSubject<RunningApp[]>([])

    public readonly userInfo$ = AssetsBrowserClient.getUserInfo$().pipe(
        share()
    )
    public readonly defaultDrive$ = AssetsBrowserClient.getDefaultDrive$().pipe(
        share()
    )

    homeFolderNode: Nodes.HomeNode
    homeTreeState: TreeState
    downloadFolderNode: Nodes.DownloadNode
    trashFolderNode: Nodes.TrashNode
    recentNode = new Nodes.RecentNode({ name: 'Recent' })

    constructor() {

        this.defaultDrive$.subscribe((resp) => {
            this.homeFolderNode = new Nodes.HomeNode({
                id: resp.homeFolderId,
                groupId: resp.groupId,
                parentFolderId: resp.driveId,
                driveId: resp.driveId,
                name: resp.homeFolderName,
                children: AssetsBrowserClient.getFolderChildren$(resp.groupId, resp.driveId, resp.homeFolderId)
            })
            this.homeTreeState = new TreeState({ rootNode: this.homeFolderNode })
            this.flux = new FluxState(this.homeTreeState)
            this.story = new StoryState(this.homeTreeState)
            this.data = new DataState(this.homeTreeState)
            this.allStates = [this.flux, this.story, this.data]
            this.specificActions = this.allStates.map(s => s.actions).flat()
            this.downloadFolderNode = new Nodes.DownloadNode({
                id: resp.downloadFolderId,
                groupId: resp.groupId,
                parentFolderId: resp.driveId,
                driveId: resp.driveId,
                name: resp.downloadFolderName,
                children: AssetsBrowserClient.getFolderChildren$(resp.groupId, resp.driveId, resp.homeFolderId)
            })
            this.trashFolderNode = new Nodes.TrashNode({
                id: 'trash',
                groupId: resp.groupId,
                driveId: resp.driveId,
                name: 'Trash',
                children: AssetsBrowserClient.getFolderChildren$(resp.groupId, resp.driveId, resp.homeFolderId)
            })
            this.openFolder(this.homeFolderNode)
            this.homeTreeState.directUpdates$.subscribe((updates) => {
                console.log("Got updates", updates)
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

        let childFolder = new Nodes.FolderNode({
            groupId: parentNode.groupId,
            driveId: parentNode.driveId,
            name: 'new folder',
            id: uuidv4(),
            parentFolderId: parentNode.id,
            children: []
        } as any)
        this.homeTreeState.addChild(parentNode.id, childFolder)
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
        this.homeTreeState.replaceAttributes(node, { name: newName })
    }

    deleteFolder(node: Nodes.FolderNode) {
        this.homeTreeState.removeNode(node)
    }

    deleteItem(node: Nodes.ItemNode) {
        this.homeTreeState.removeNode(node)
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
            this.homeTreeState.addChild(folder.id, progressNode)
        })
        allProgresses.forEach(request => {
            request.pipe(
                filter(progress => progress.step == UploadStep.FINISHED)
            ).subscribe((progress) => {
                let uploadNode = this.homeTreeState.getNode("progress_" + progress.fileName)
                this.homeTreeState.removeNode(uploadNode)
                let child = new Nodes.DataNode({
                    id: progress.result.treeId,
                    driveId: folder.driveId,
                    groupId: folder.groupId,
                    name: progress.result.name,
                    assetId: progress.result.assetId,
                    rawId: progress.result.relatedId,
                    borrowed: progress.result.borrowed,
                })
                this.homeTreeState.addChild(folder.id, child)
            })
        })
    }
}



