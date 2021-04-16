import { Select } from '@youwol/fv-input';
import { child$, VirtualDOM } from '@youwol/flux-view';
import { BehaviorSubject, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppState } from '../../../app.state';
import { AssetsBrowserClient } from '../../../assets-browser.client';
import { Asset, AssetWithAccessInfo } from '../../../data';
import { AssetTabView } from '../data';



export function preview(appState: AppState, asset: Asset) {

    let factory = {

        text: (content) => ({
            class: 'overflow-auto mx-2', style: { 'max-width': '33vw' }, innerText: content
        }),
        image: (src) => ({
            class: 'mx-2', style: { 'max-width': '33vw' },
            children: [
                {
                    tag: 'img', src,
                    class: 'd-flex justify-content-center w-100 px-2',
                    style: { "margin-top": "auto", "margin-bottom": "auto" }
                }
            ]
        })
    }
    return {
        snippets: {},
        view: AssetsBrowserClient.dataPreview$(asset.rawId).pipe(

            map((preview: any) => factory[preview.kind]
                ? factory[preview.kind](preview.content)
                : {}
            )
        )
    }
}
export function getActions(asset: Asset) {

    return {
        class: "w-100 d-flex flex-wrap",
        children: []
    }
}


let mimeTypes = ["application/json", "text/html", "application/javascript", "text/plain", "text/markdown",
"application/x-yaml", "text/yaml","image/png", "image/jpeg", "image/gif", "image/bmp", "image/x-icon", 
"image/tiff", "image/webp", "image/svg+xml"]

let encodingTypes = [ 'identity', 'br', 'gzip']

export class DataMetadataTabView extends AssetTabView {

    constructor(public readonly asset: AssetWithAccessInfo, public readonly appState: AppState) {
        super("metadata", "Metadata", asset, appState)
    }

    view(): VirtualDOM {

        return {
            class: 'd-flex flex-column p-5',
            children: [                
                {
                    class: 'd-flex align-items-center m-3 fv-text-primary',
                    children: [
                        {   innerText: "content url:", class: "px-2" },
                        {   tag: 'a', href: `/api/assets-gateway/raw/data/${this.asset.rawId}`, 
                            innerText: `/api/assets-gateway/raw/data/${this.asset.rawId}`,  
                            style:{'font-family': 'fantasy'} }
                    ]
                },
                child$(
                    AssetsBrowserClient.getDataMetadata$(this.asset.rawId),
                    (metadata: { contentEncoding, contentType }) => {

                        return {
                            class: 'fv-text-primary',
                            children: [
                                optionPicker(this.asset, metadata, "contentType"),
                                optionPicker(this.asset, metadata, "contentEncoding")
                            ]
                        }
                    })
                ]
        }
    }
}

function editBttn(edition$: Subject<boolean>) {

    return { tag: 'i', class: 'fas fa-pen px-2', onclick: () =>   edition$.next(true)  }
}

function updateBttn(asset, edition$: Subject<boolean>, value$: BehaviorSubject<string>, attName:string) {
    return { 
        tag: 'i', class: 'fas fa-check px-2', 
        onclick: () => {
            edition$.next(false) 
            AssetsBrowserClient.updateDataMetadata$(asset.rawId, {[attName]:value$.getValue() }).subscribe(
                () => {}
            )
        }
    }
}


function optionPicker(asset, metadata, attName:string){

    let options = attName == 'contentType' ? mimeTypes : encodingTypes

    let itemsOptions = options.map( (name) => new Select.ItemData(name, name))
    
    let selected$ = new BehaviorSubject<string>(metadata[attName])

    let groupSelectState = new Select.State( itemsOptions, selected$ )

    let selectView = new Select.View({state:groupSelectState})
    
    let typeEditing$ = new BehaviorSubject<boolean>(false)

    return {
        class: 'd-flex align-items-center m-3',
        children: [
            { innerText: `${attName}:`, class: "px-2" },
            child$(
                typeEditing$,
                editing => {
                    let value = selected$.getValue() 
                    if (!editing)
                        return { innerText: value == '' ? 'identity' : value , style:{'font-family': 'fantasy'} }
                    else
                        return selectView
                }
            ),
            child$(
                typeEditing$,
                editing => editing ? updateBttn(asset, typeEditing$, selected$, attName) :  editBttn(typeEditing$) 
            )
        ]
    }
}