import { uuidv4 } from '@youwol/flux-core'
import { BehaviorSubject, combineLatest, from, merge, Observable, Subject } from "rxjs"
import { mergeMap, share } from 'rxjs/operators'
import { AssetsBrowserClient } from './assets-browser.client'
import { Asset, Nodes } from './data'
import { BrowserState } from './views/panel-browser.state'

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

export class AppState extends BrowserState{

    selectedDrive$ = new Subject<Nodes.DriveNode>()
    selectedFolder$ = new Subject<Nodes.FolderNode>()
    selectedAsset$ = new BehaviorSubject<Asset>(undefined)
    updatedAsset$ = new Subject<Asset>()
    deletedAsset$ = new Subject<Asset>()
    duplicatedAsset$ = new Subject<Asset>()

    assets$ = new Subject<any>()

    recursiveSearch$ = new BehaviorSubject<boolean>(false)
    queryString$ = new BehaviorSubject<string>("")
    
    items$ : Observable<any>

    browserState : BrowserState

    constructor(){
        super(
            new Nodes.RootNode({ id: 'root', name: 'Subscribed groups', children:  AssetsBrowserClient.getGroupsChildren$() }), 
            new Subject<{type:string}>()
            )
        this.browserState = this // This is until all actions from browser state have been exposed here

        this.items$ = combineLatest([this.recursiveSearch$,merge(this.selectedDrive$,this.selectedFolder$)]).pipe(
          mergeMap( ([recToggled,node]:[boolean, Nodes.FolderNode | Nodes.DriveNode]) => {
              let query = {
                driveId: node.driveId,
                groupId: node.groupId,
                folderId: node.id,
                recursive: recToggled,
                queryStr: this.queryString$.getValue(),
                fluxProject: true
              }
              return AssetsBrowserClient.queryAssets$(query)
          } ),
          share()
        )

        this.command$.subscribe( ({type}) => {
            if(type=='refresh')
                this.refreshAssetCardsView()
        })

        window.addEventListener("paste", (pasteEvent) => {
            this.addImageFromClipboard(pasteEvent)
        }, false);

    }    


    /*
    Following actions are mostly related to browser-side actions
    */

   updateSelection( node: Nodes.BrowserNode){

        if (node instanceof Nodes.ItemNode){
            AssetsBrowserClient.getAsset$(node.assetId)
            .subscribe( (asset: any) => {
                this.updatedAsset$.next(asset)
                this.selectedAsset$.next(new Asset(asset))
            })
        }
        if (node instanceof Nodes.FolderNode)
            this.selectedFolder$.next(node)
        if (node instanceof Nodes.DriveNode)
            this.selectedDrive$.next(node)
        /*if (node instanceof Nodes.GroupNode)
            this.selectedGroup$.next(node)*/
        // redo the previous search query
        this.command$.next({type:"refresh"})
   }

    deleteItem( node: Nodes.ItemNode) {

        this.browserState.deleteItem$(node).subscribe( ( {node, parentNode}) => {
            this.updateSelection(parentNode)
        })
    }

    deleteFolder(node: Nodes.FolderNode) {

        this.browserState.deleteFolder$(node).subscribe( ( {node, parentNode}) => {
            this.updateSelection(parentNode)
        })
    }

    deleteDrive(node: Nodes.DriveNode) {
        this.browserState.deleteDrive$(node).subscribe( ( {node, parentNode}) => {
            this.updateSelection(parentNode)
        })
    }

    newFluxProject(node: Nodes.FolderNode) {

        this.browserState.newFluxProject$(node).subscribe( ({node, parentNode}) => {
            this.updateSelection(parentNode)   
            this.updateSelection(node)   
        })
    }

    rename(node: Nodes.DriveNode  | Nodes.FolderNode | Nodes.ItemNode, newName: string) {

        node.removeStatus({ type: 'renaming' })

        if (node instanceof Nodes.FolderNode)
            this.browserState.renameFolder$(node, newName).subscribe()
    
        if (node instanceof Nodes.DriveNode)
            this.browserState.renameDrive$(node, newName).subscribe()

        if (node instanceof Nodes.ItemNode)
            this.browserState.renameAsset$(node, newName).subscribe( ({node, respData}) => {
                this.selectedAsset$.next(new Asset(respData))
                this.command$.next({type:"refresh"})
            }
        )
    }
    
    exposeGroup(node:Nodes.FolderNode, {groupId, path}){
                
        this.browserState.newGroupShowcase$(node, {groupId, path}).subscribe( ({node, parentNode}) => {  
            this.updateSelection(parentNode)
        })
    }

    /*
    Following actions are mostly related to the asset's editor actions
    */

    updateAsset( asset: Asset, attributesUpdate: {[key:string]: any}){

        let node = this.getNode(asset.treeId) 
        let uid = uuidv4()
        node && node.addStatus( {type:'request-pending', id:uid })

        AssetsBrowserClient.updateAsset$(asset, attributesUpdate).subscribe( (asset: Asset) => {

            node && node.removeStatus( {type:'request-pending', id:uid })
            this.selectedAsset$.next(new Asset(asset))
            if( node && attributesUpdate.name){
                this.replaceAttributes(node, { name: attributesUpdate.name }) 
            } 
            if( attributesUpdate.name )
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
            mergeMap( (picture) => {
                return AssetsBrowserClient.addPicture$(asset, picture)
            })
        ).subscribe( (asset: any) => {
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
            .subscribe( (asset: any) => {
                this.updatedAsset$.next(asset)
                this.selectedAsset$.next(new Asset(asset))
            })
        }
    }

    removePicture(asset: Asset, pictureId: string) {
        AssetsBrowserClient.removePicture$(asset, pictureId)
            .subscribe( (assetData: any) => {
                let asset = new Asset(assetData)
                this.updatedAsset$.next(asset)
                this.selectedAsset$.next(asset)
            })
    }


    refreshAssetCardsView(){
        this.recursiveSearch$.next(this.recursiveSearch$.getValue())
    }
}



        /*
        this.deletedItem$.pipe(
            map( () => new Request(`/api/assets-backend/query`, { method: 'POST', body: JSON.stringify(body) })),
            mergeMap( (request: Request) => from(fetch(request).then( r => r.json())) )
        ).subscribe(
            assets =>  {
                this.assets$.next(assets) 
                this.selectedItem$.next(undefined)
            }
        )
        
        this.duplicatedItem$.pipe(
            map( (asset) => ({
                request:new Request(`/api/assets-backend/query`, { method: 'POST', body: JSON.stringify(body) }),
                asset
            })),
            mergeMap( ({asset,request}) => from(fetch(request).then( r => r.json())).pipe( map( (assets)=> ({asset, assets}))))
        ).subscribe(
            ({asset, assets}) =>  {
                this.assets$.next(assets) 
                this.selectedItem$.next(asset)
            }
        )*/
