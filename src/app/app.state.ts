import { uuidv4 } from '@youwol/flux-core'
import { BehaviorSubject, combineLatest, from, merge, Observable, ReplaySubject, Subject } from "rxjs"
import { filter, map, mergeMap, share, shareReplay, tap } from 'rxjs/operators'
import { AssetsBrowserClient, Folder } from './assets-browser.client'
import { Asset, Nodes } from './data'
import { BrowserState } from './views/panel-browser.state'
import { YouwolBannerState } from "@youwol/flux-youwol-essentials"
import { install } from '@youwol/cdn-client'
import { ImmutableTree } from '@youwol/fv-tree'



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

export class AppState extends BrowserState {

    topBannerState = new YouwolBannerState({ cmEditorModule$: fetchCodeMirror$() })
    selectedDrive$ = new Subject<Nodes.DriveNode>()
    selectedItem$ = new ReplaySubject<Nodes.BrowserNode>(1)

    openFolder$ = new ReplaySubject<Nodes.BrowserNode>(1)
    currentFolder$ = this.openFolder$.pipe(
        filter((selection) => selection instanceof Nodes.FolderNode),
        mergeMap((folder) => {
            this.homeTreeState.getChildren(folder)
            return this.homeTreeState.getChildren$(folder).pipe(map(() => folder))
        }),
        shareReplay()
    ) as Observable<Nodes.FolderNode>

    selectedAsset$ = new BehaviorSubject<Asset>(undefined)
    updatedAsset$ = new Subject<Asset>()
    deletedAsset$ = new Subject<Asset>()
    duplicatedAsset$ = new Subject<Asset>()

    userInfo$ = AssetsBrowserClient.getUserInfo$().pipe(
        share()
    )
    defaultDrive$ = AssetsBrowserClient.getDefaultDrive$().pipe(
        share()
    )

    homeFolderNode: Nodes.HomeNode
    homeTreeState: TreeState
    downloadFolderNode: Nodes.DownloadNode
    trashFolderNode: Nodes.TrashNode
    recentNode = new Nodes.RecentNode({ name: 'Recent' })

    assets$ = new Subject<any>()

    items$: Observable<any>

    browserState: BrowserState

    constructor() {
        super(
            new Nodes.RootNode({ id: 'root', name: 'Subscribed groups', children: AssetsBrowserClient.getGroupsChildren$() }),
            new Subject<{ type: string }>()
        )
        this.browserState = this // This is until all actions from browser state have been exposed here

        window.addEventListener("paste", (pasteEvent) => {
            this.addImageFromClipboard(pasteEvent)
        }, false);

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

    /*
    Following actions are mostly related to browser-side actions
    */

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

    newFluxProject(parentNode: Nodes.FolderNode) {
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
        /*this.browserState.newFluxProject$(parentNode).subscribe(({ node, parentNode }) => {
            this.updateSelection(parentNode)
            this.updateSelection(node)
        })*/
    }


    rename(node: Nodes.FolderNode | Nodes.ItemNode, newName: string) {

        node.removeStatus({ type: 'renaming' })
        this.homeTreeState.replaceAttributes(node, { name: newName })
    }

    deleteFolder(node: Nodes.FolderNode) {
        this.homeTreeState.removeNode(node)
    }

    //  Old stuff below
    updateSelection(node: Nodes.BrowserNode) {

        if (node instanceof Nodes.ItemNode) {
            AssetsBrowserClient.getAsset$(node.assetId)
                .subscribe((asset: any) => {
                    this.updatedAsset$.next(asset)
                    this.selectedAsset$.next(new Asset(asset))
                })
        }
        /*if (node instanceof Nodes.FolderNode)
            this.selectedFolder$.next(node)*/
        if (node instanceof Nodes.DriveNode)
            this.selectedDrive$.next(node)
        /*if (node instanceof Nodes.GroupNode)
            this.selectedGroup$.next(node)*/
        // redo the previous search query
        this.command$.next({ type: "refresh" })
    }

    deleteItem(node: Nodes.ItemNode) {

        this.browserState.deleteItem$(node).subscribe(({ node, parentNode }) => {
            this.updateSelection(parentNode)
        })
    }


    deleteDrive(node: Nodes.DriveNode) {
        this.browserState.deleteDrive$(node).subscribe(({ node, parentNode }) => {
            this.updateSelection(parentNode)
        })
    }

    newStory(node: Nodes.FolderNode) {

        this.browserState.newStory$(node).subscribe(({ node, parentNode }) => {
            this.updateSelection(parentNode)
            this.updateSelection(node)
        })
    }

    exposeGroup(node: Nodes.FolderNode, { groupId, path }) {

        this.browserState.newGroupShowcase$(node, { groupId, path }).subscribe(({ node, parentNode }) => {
            this.updateSelection(parentNode)
        })
    }

    /*
    Following actions are mostly related to the asset's editor actions
    */

    updateAsset(asset: Asset, attributesUpdate: { [key: string]: any }) {

        let node = this.getNode(asset.treeId)
        let uid = uuidv4()
        node && node.addStatus({ type: 'request-pending', id: uid })

        AssetsBrowserClient.updateAsset$(asset, attributesUpdate).subscribe((asset: Asset) => {

            node && node.removeStatus({ type: 'request-pending', id: uid })
            this.selectedAsset$.next(new Asset(asset))
            if (node && attributesUpdate.name) {
                this.replaceAttributes(node, { name: attributesUpdate.name })
            }
            if (attributesUpdate.name)
                this.refreshAssetCardsView()
        })
    }

    newImage(src, file) {
        let id = file ? "" + Math.floor(Math.random() * 1e5) + "." + file.name.split('.').slice(-1) : src.split('/').slice(-1)
        return { id, src, file }
    }

    addImages(asset: Asset, files0) {

        let files = []
        for (let file of files0)
            files.push(file)

        let pictures = files
            .filter(file => validFileType(file))
            .map(file => this.newImage(URL.createObjectURL(file), file))

        console.log("Add  images")
        from(pictures).pipe(
            mergeMap((picture) => {
                return AssetsBrowserClient.addPicture$(asset, picture)
            })
        ).subscribe((asset: any) => {
            console.log("Asset!!", asset)
            this.updatedAsset$.next(asset)
            this.selectedAsset$.next(new Asset(asset))
        })
    }

    addImageFromClipboard(pasteEvent) {

        let asset = this.selectedAsset$.getValue()

        let files = pasteEvent.clipboardData.files;
        if (files.length == 1 && files[0].type.indexOf("image") === 0) {
            var file = files[0];
            let picture = this.newImage(URL.createObjectURL(file), file)
            AssetsBrowserClient.addPicture$(asset, picture)
                .subscribe((asset: any) => {
                    this.updatedAsset$.next(asset)
                    this.selectedAsset$.next(new Asset(asset))
                })
        }
    }

    removePicture(asset: Asset, pictureId: string) {
        AssetsBrowserClient.removePicture$(asset, pictureId)
            .subscribe((assetData: any) => {
                let asset = new Asset(assetData)
                this.updatedAsset$.next(asset)
                this.selectedAsset$.next(asset)
            })
    }


    refreshAssetCardsView() {

    }
}



