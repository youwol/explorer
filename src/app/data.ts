import { uuidv4 } from '@youwol/flux-core';
import { ImmutableTree } from "@youwol/fv-tree";
import { BehaviorSubject, Observable } from "rxjs";
import { share, tap } from 'rxjs/operators';
import { AssetsBrowserClient } from './assets-browser.client';




export const UploadStep = {
    START: 'start',
    SENDING: 'sending',
    PROCESSING: 'processing',
    FINISHED: 'finished'
}

export class progressMessage{


    constructor( public readonly fileName, public readonly step, public readonly percentSent = 0,
        public readonly result = undefined ){
    }
} 

export class Asset{

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
    constructor( {treeId, assetId, rawId, kind, name, groupId, description, images, thumbnails, tags}:
        {treeId: string, assetId: string, rawId: string, kind: string, name: string, groupId: string,
         description: string, images: Array<string>, thumbnails: Array<string>, tags: Array<string>}) {

            this.treeId = treeId
            this.assetId = assetId
            this.rawId = rawId
            this.kind = kind
            this.name = name
            this.groupId = groupId
            this.description = description
            this.images = images
            this.thumbnails = thumbnails
            this.tags = tags
    }
}

export interface Access{
    read:string
    share:string
    parameters: {[key:string]: any}
    expiration:  number | null
}

export interface ExposingGroupAccess{
    name:string
    groupId: string
    access:Access
}

export interface AccessInfo{
    owningGroup: {name: string},
    consumerInfo: {permissions:{read: boolean, write: boolean, expiration: number | null}},
    ownerInfo: null | {exposingGroups: Array<ExposingGroupAccess>, defaultAccess:Access}
}

export class AssetWithAccessInfo extends Asset {

    public readonly accessInfo$ : BehaviorSubject<AccessInfo>

    constructor(d) {
        super(d)
        this.accessInfo$ = AssetsBrowserClient.accessInfo$(this.assetId).pipe(share())
    }
}

export class Favorite{
    constructor(
        public readonly name: string, 
        public readonly assetId: string, 
        public readonly imageSrc: string = undefined){}
}
export namespace Nodes {

    export function itemNodeFactory( data) {

        if(data.kind=='flux-project')
            return new Nodes.FluxProjectNode(data)

        if(data.kind=='data')
            return new Nodes.DataNode(data)
            
        if(data.kind=='package')
            return new Nodes.PackageNode(data)
            
        throw Error(`itemNodeFactory: ${data.kind} not known`)        
    }
    
    export class BrowserNode extends ImmutableTree.Node {

        name: string
        status$ = new BehaviorSubject< Array<{type: string, id: string}>>([])

        constructor({ id, name, children }: { id: string, name: string, children?: undefined | Array<BrowserNode> | Observable<Array<BrowserNode>> }) {
            super({ id, children })
            this.name = name
        }

        addStatus({type, id} : {type:string, id?: string}){
            id = id || this.id
            let newStatus = this.status$.getValue().concat({type,id})
            this.status$.next(newStatus)
        }

        removeStatus({type, id} : {type:string, id?: string}){
            id = id || this.id
            let newStatus = this.status$.getValue().filter( s => s.type!=type && s.id!=id)
            this.status$.next(newStatus)
        }
        resolveChildren() : Observable<Array<BrowserNode>> {
            if(!this.children || Array.isArray(this.children))
                return
            
            let uid = uuidv4()
            this.addStatus( {type:'request-pending', id:uid })
            return super.resolveChildren().pipe(
                tap(() => {
                    this.removeStatus( {type:'request-pending', id:uid })
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

        constructor({ id, name, children }: { id: string, name: string, children?: Array<BrowserNode> | Observable<Array<BrowserNode>> }) {
            super({ id, name, children })
            this.name = name
        }
    }
    export class DriveNode extends BrowserNode {

        name: string
        groupId: string
        driveId: string

        constructor({ id, groupId, driveId, name, children }: 
            { id: string, groupId: string, driveId: string, name: string, children?: Array<BrowserNode> | Observable<Array<BrowserNode>> }) {
            super({ id, name, children })
            this.name = name
            this.driveId = driveId
            this.groupId = groupId
        }
        
    }
    export class FolderNode extends BrowserNode {

        name: string
        groupId: string
        driveId: string
        parentFolderId: string

        constructor({ id, groupId, driveId, parentFolderId, name, children }: 
            { id: string, groupId: string, parentFolderId: string, driveId: string, name: string, children?: Array<BrowserNode> | Observable<Array<BrowserNode>> }) {
            super({ id, name, children })
            this.name = name
            this.driveId = driveId
            this.parentFolderId = parentFolderId
            this.groupId = groupId
        }
    }    
    export abstract class ItemNode extends BrowserNode {

        name: string
        //folderId: string
        groupId: string
        driveId: string
        relatedId: string
        assetId: string
        borrowed: boolean

        constructor({ id, groupId, name, driveId, assetId, relatedId,  borrowed}: 
            { id: string, groupId: string, driveId: string, name: string, 
                assetId: string, relatedId: string,  borrowed: boolean,}) {
            super({ id, name, children: undefined })
            this.name = name
            //this.folderId = folderId
            this.groupId = groupId
            this.assetId = assetId
            this.relatedId = relatedId
            this.driveId = driveId
            this.borrowed = borrowed
        }
    }

    export class FluxProjectNode extends ItemNode {

        constructor({ id, groupId, driveId, name, assetId, relatedId,  borrowed}: 
            { id: string, groupId: string, driveId: string, name: string, 
                assetId: string, relatedId: string,  borrowed: boolean,}) {
            super({ id,  groupId,  name, driveId, assetId, relatedId,  borrowed})
        }
    }
    
    export class FluxPackNode extends ItemNode {

        constructor({ id, groupId, driveId, name, assetId, relatedId,  borrowed}: 
            { id: string, groupId: string, driveId: string, name: string, 
                assetId: string, relatedId: string,  borrowed: boolean,}) {
            super({ id,  groupId,  name, driveId, assetId, relatedId,  borrowed})
        }
    }

    export class PackageNode extends ItemNode {
        constructor({ id, groupId, driveId, name, assetId, relatedId,  borrowed}: 
            { id: string, groupId: string, driveId: string, name: string, 
                assetId: string, relatedId: string,  borrowed: boolean,}) {
            super({ id,  groupId,  name, driveId, assetId, relatedId,  borrowed})
        }
    }

    export class TrashNode extends BrowserNode {

        name: string
        groupId: string
        driveId: string
        constructor({ id, groupId, driveId, name, children }: { id: string, groupId: string, driveId: string, name: string, children?: Array<BrowserNode> | Observable<Array<BrowserNode>> }) {
            super({ id, name, children })
            this.name = name
            this.driveId = driveId
            this.groupId = groupId
        }
    }

    export class DeletedNode extends BrowserNode { 

        name: string
        driveId: string

        constructor({id, name, driveId}){
            super({ id, name, children: undefined })
            this.name = name
            this.driveId = driveId
        }
    }

    export class DeletedFolderNode extends DeletedNode {

        name: string
        driveId: string
        
        constructor({ id, driveId, name }: { id: string, driveId: string, name: string}) {
            super({ id, name, driveId })
        }
    }
    export class DeletedItemNode extends DeletedNode {

        name: string
        driveId: string
        type: string

        constructor({ id, driveId, name, type }: { id: string, driveId: string, name: string, type:string}) {
            super({ id, name, driveId })
            this.type = type
        }
    }

    export class ExposedGroupNode extends ItemNode {

        constructor({ id, groupId, driveId, name, assetId, relatedId,  borrowed}: 
            { id: string, groupId: string, driveId:string, name: string, 
                assetId: string, relatedId: string,  borrowed: boolean}) {
            super({ id, groupId, name, driveId, assetId, relatedId,  borrowed})
        }
    }

    export class DataNode extends ItemNode {

        constructor({ id, groupId, name, driveId, assetId, relatedId,  borrowed}: 
            { id: string, groupId: string, driveId: string, name: string, 
                assetId: string, relatedId: string,  borrowed: boolean}) {
            super({ id, groupId, name, assetId, driveId, relatedId,  borrowed})
        }
    }

    export class ProgressNode extends BrowserNode {

        progress$ : Observable<progressMessage>

        constructor({ id, name, progress$}: 
            { id: string, name: string, progress$:Observable<progressMessage>}) {
            super({id, name})
            this.progress$ = progress$
        }
    }
}