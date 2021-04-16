import { attr$, child$ } from "@youwol/flux-view"
import { BehaviorSubject } from "rxjs"
import { filter } from 'rxjs/operators'
import { AppState } from '../../../app.state'
import { AssetWithAccessInfo } from '../../../data'



export function preview( appState: AppState, asset: AssetWithAccessInfo) {
    
    let selectedSnippet$ = new BehaviorSubject<number>(0)
    selectedSnippet$.next(0)

    return {
        snippets: {
            class: 'h-100', style: { width: '150px', 'min-width': '150px', 'max-width': '150px' },
            children: [
                {
                    children: asset.thumbnails.map((thumbnail, index) => {
                        let baseClasses = "d-flex justify-content-center w-100 fv-border"
                        return {
                            class:'d-fex align-items-center mb-2 position-relative',
                            children: [
                                {
                                    class: attr$(
                                        selectedSnippet$,
                                        selected => selected == index ? baseClasses + " fv-color-focus" : baseClasses
                                    ),
                                    tag: 'img',
                                    src: thumbnail,
                                    style: { 'margin-top': 'auto', 'margin-bottom': 'auto', },
                                    onclick: () => selectedSnippet$.next(index)
                                },
                                child$( 
                                    asset.accessInfo$.pipe( filter(info => info.consumerInfo.permissions.write)),
                                    () => ({
                                        tag:'i',
                                        class: 'fas fa-trash position-absolute fv-bg-background rounded p-1 fv-hover-opacity',
                                        style:{top:'5px', left:'5px'},
                                        onclick: (ev) => appState.removePicture(asset, thumbnail.split('/').slice(-1)[0])
                                    }) 
                                )
                            ]
                        }
                    })
                },
                child$(
                    asset.accessInfo$.pipe(filter(info => info.consumerInfo.permissions.write)),
                    () => ({                        
                        class:'p-2 w-100',
                        children:[
                            {   tag: "label", class: "fas fa-2x fa-upload fv-pointer w-100 text-center",
                                for: "image_uploads",
                                onclick: (ev) => document.getElementById("image_uploads").dispatchEvent(new MouseEvent('click'))  },
                            {
                                tag: "input", type: "file", id: "image_uploads", class: "hoverable", multiple: true,
                                accept: ".jpg, .jpeg, .png", style:{width:'0px', opacity:'0'},
                                oninput: (event) => appState.addImages(asset, event.target.files)
                            }
                        ]
                    })
                ),
                child$(
                    asset.accessInfo$.pipe(filter(info => info.consumerInfo.permissions.write)),
                    () => ({
                    tag: "div", class: "d-flex flex-row w-100",
                    children: [
                        { tag: "label", class: "text-center w-100 py-4", 
                          innerHTML: "<em>you can also paste from clipboard</em>", for: "image_clipboard" },
                    ],
                    })
                )
            ]
        },
        view:{
            class: 'w-50',
            children: [
                {
                    class: "d-flex justify-content-center w-100 px-2",
                    tag: 'img',
                    src: attr$(selectedSnippet$,(index) => asset.images[index]),
                    style: { 'margin-top': 'auto', 'margin-bottom': 'auto', }
                }
            ]
        }
    }
}