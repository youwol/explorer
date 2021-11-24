import { uuidv4 } from '@youwol/flux-core';
import { ImmutableTree } from "@youwol/fv-tree";
import { BehaviorSubject, Observable } from "rxjs";
import { delay, share, tap } from 'rxjs/operators';
import { AssetsBrowserClient, debugDelay } from './assets-browser.client';




export const UploadStep = {
    START: 'start',
    SENDING: 'sending',
    PROCESSING: 'processing',
    FINISHED: 'finished'
}

export class progressMessage {


    constructor(public readonly fileName, public readonly step, public readonly percentSent = 0,
        public readonly result = undefined) {
    }
}

export class Asset {

    public readonly treeId: string
    public readonly assetId: string
    public readonly rawId: string
    public readonly kind: string
    public readonly name: string
    public readonly groupId: string
    public readonly description: string
    public readonly images: Array<string>
    public readonly thumbnails: Array<string>
    public readonly tags: Array<string>
    public readonly permissions: any
    constructor(params:
        {
            treeId: string, assetId: string, rawId: string, kind: string, name: string, groupId: string,
            description: string, images: Array<string>, thumbnails: Array<string>, tags: Array<string>
        }) {
        Object.assign(this, params)
    }
}

export interface Access {
    read: string
    share: string
    parameters: { [key: string]: any }
    expiration: number | null
}

export interface ExposingGroupAccess {
    name: string
    groupId: string
    access: Access
}

export interface AccessInfo {
    owningGroup: { name: string },
    consumerInfo: { permissions: { read: boolean, write: boolean, expiration: number | null } },
    ownerInfo: null | { exposingGroups: Array<ExposingGroupAccess>, defaultAccess: Access }
}

export class AssetWithAccessInfo extends Asset {

    public readonly accessInfo$: BehaviorSubject<AccessInfo>

    constructor(d) {
        super(d)
        this.accessInfo$ = AssetsBrowserClient.accessInfo$(this.assetId).pipe(share())
    }
}

export class Favorite {
    constructor(
        public readonly name: string,
        public readonly assetId: string,
        public readonly imageSrc: string = undefined) { }
}
export namespace Nodes {

    export class BrowserNode extends ImmutableTree.Node {

        name: string
        status$ = new BehaviorSubject<Array<{ type: string, id: string }>>([])
        icon: string

        constructor(params: { id: string, name: string, icon?: string, children?: undefined | Array<BrowserNode> | Observable<Array<BrowserNode>> }) {
            super(params)
            Object.assign(this, params)
        }

        addStatus({ type, id }: { type: string, id?: string }) {
            id = id || this.id
            let newStatus = this.status$.getValue().concat({ type, id })
            this.status$.next(newStatus)
        }

        removeStatus({ type, id }: { type: string, id?: string }) {
            id = id || this.id
            let newStatus = this.status$.getValue().filter(s => s.type != type && s.id != id)
            this.status$.next(newStatus)
        }
        resolveChildren(): Observable<Array<BrowserNode>> {
            if (!this.children)
                return

            let uid = uuidv4()
            this.addStatus({ type: 'request-pending', id: uid })
            return super.resolveChildren().pipe(
                delay(debugDelay),
                tap(() => {
                    this.removeStatus({ type: 'request-pending', id: uid })
                })
            ) as Observable<Array<BrowserNode>>
        }
    }
    export class RootNode extends BrowserNode {

        name: string
        constructor({ id, name, children }: { id: string, name: string, children?: Array<BrowserNode> | Observable<Array<BrowserNode>> }) {
            super({ id, name, children })
            this.name = name
        }
    }
    export class GroupNode extends BrowserNode {

        name: string
        groupId: string

        constructor(params: { id: string, name: string, icon: string, children?: Array<BrowserNode> | Observable<Array<BrowserNode>> }) {
            super(params)
            Object.assign(this, params)
            this.groupId = params.id
        }
    }

    export class FolderNode extends BrowserNode {

        name: string
        groupId: string
        driveId: string
        parentFolderId: string
        icon = "fas fa-folder"

        constructor(params:
            {
                id: string, groupId: string, parentFolderId: string, driveId: string,
                name: string, children?: Array<BrowserNode> | Observable<Array<BrowserNode>>,
                icon?: string
            }) {
            super(params)
            Object.assign(this, params)
        }
    }

    export class DriveNode extends FolderNode {

        name: string
        groupId: string
        driveId: string

        constructor(params:
            { id: string, groupId: string, driveId: string, name: string, icon: string, children?: Array<BrowserNode> | Observable<Array<BrowserNode>> }) {
            super({ ...params, parentFolderId: params.groupId })
            Object.assign(this, params)
        }

    }

    export class HomeNode extends FolderNode {

        constructor(params:
            { id: string, groupId: string, parentFolderId: string, driveId: string, name: string, children?: Array<BrowserNode> | Observable<Array<BrowserNode>> }) {
            super({ ...params, icon: "fas fa-home" })
        }
    }
    export class DownloadNode extends FolderNode {

        constructor(params:
            { id: string, groupId: string, parentFolderId: string, driveId: string, name: string, children?: Array<BrowserNode> | Observable<Array<BrowserNode>> }) {
            super({ ...params, icon: "fas fa-shopping-cart" })
        }
    }
    export class RecentNode extends FolderNode {
        icon = "fas fa-clock"
        constructor(params) {
            super(params)
        }
    }


    export abstract class ItemNode extends BrowserNode {

        name: string
        icon = "fas fa-file"
        groupId: string
        driveId: string
        rawId: string
        assetId: string
        borrowed: boolean

        constructor(params:
            {
                id: string, groupId: string, driveId: string, name: string,
                assetId: string, rawId: string, borrowed: boolean,
                icon?: string
            }) {
            super({ ...params, children: undefined })
            Object.assign(this, params)
        }
    }

    export class FluxProjectNode extends ItemNode {

        constructor(params:
            {
                id: string, groupId: string, driveId: string, name: string,
                assetId: string, rawId: string, borrowed: boolean,
            }) {
            super({ ...params, icon: 'fas fa-play' })
        }
    }
    export class FutureNode extends BrowserNode {
        onResponse: any
        request: any
        constructor(params:
            {
                icon: string, name: string, onResponse: any, request: any
            }) {
            super({ ...params, id: uuidv4() })
            Object.assign(this, params)
        }
    }

    export class StoryNode extends ItemNode {
        kind = "story"
        constructor({ id, groupId, driveId, name, assetId, rawId, borrowed }:
            {
                id: string, groupId: string, driveId: string, name: string,
                assetId: string, rawId: string, borrowed: boolean,
            }) {
            super({ id, groupId, name, driveId, assetId, rawId, borrowed, icon: 'fas fa-book' })
        }
    }

    export class FluxPackNode extends ItemNode {
        kind = "flux-project"
        constructor({ id, groupId, driveId, name, assetId, rawId, borrowed }:
            {
                id: string, groupId: string, driveId: string, name: string,
                assetId: string, rawId: string, borrowed: boolean,
            }) {
            super({ id, groupId, name, driveId, assetId, rawId, borrowed })
        }
    }

    export class PackageNode extends ItemNode {
        kind = "package"
        constructor({ id, groupId, driveId, name, assetId, rawId, borrowed }:
            {
                id: string, groupId: string, driveId: string, name: string,
                assetId: string, rawId: string, borrowed: boolean,
            }) {
            super({ id, groupId, name, driveId, assetId, rawId, borrowed })
        }
    }

    export class TrashNode extends FolderNode {
        icon = "fas fa-trash"
        name: string
        groupId: string
        driveId: string
        constructor(params: { id: string, groupId: string, driveId: string, name: string, children?: Array<BrowserNode> | Observable<Array<BrowserNode>> }) {
            super({ ...params, parentFolderId: params.driveId })
            Object.assign(this, params)
        }
    }

    export class DeletedNode extends BrowserNode {

        name: string
        driveId: string

        constructor({ id, name, driveId }) {
            super({ id, name, children: undefined })
            this.name = name
            this.driveId = driveId
        }
    }

    export class DeletedFolderNode extends DeletedNode {

        name: string
        driveId: string

        constructor({ id, driveId, name }: { id: string, driveId: string, name: string }) {
            super({ id, name, driveId })
        }
    }
    export class DeletedItemNode extends DeletedNode {

        name: string
        driveId: string
        type: string

        constructor({ id, driveId, name, type }: { id: string, driveId: string, name: string, type: string }) {
            super({ id, name, driveId })
            this.type = type
        }
    }

    export class DataNode extends ItemNode {
        kind = "data"
        icon = "fas fa-database"
        constructor({ id, groupId, name, driveId, assetId, rawId, borrowed }:
            {
                id: string, groupId: string, driveId: string, name: string,
                assetId: string, rawId: string, borrowed: boolean
            }) {
            super({ id, groupId, name, assetId, driveId, rawId, borrowed })
        }
    }

    export class ProgressNode extends BrowserNode {

        progress$: Observable<progressMessage>

        constructor({ id, name, progress$ }:
            { id: string, name: string, progress$: Observable<progressMessage> }) {
            super({ id, name })
            this.progress$ = progress$
        }
    }
}
