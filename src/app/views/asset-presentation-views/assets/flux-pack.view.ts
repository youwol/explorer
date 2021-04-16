import { child$, VirtualDOM } from '@youwol/flux-view'
import { AppState } from '../../../app.state'
import { AssetsBrowserClient } from '../../../assets-browser.client'
import { Asset, AssetWithAccessInfo } from '../../../data'
import { AssetTabView } from '../data'
import * as common from './common.view'


export function preview(appState: AppState, asset: AssetWithAccessInfo) {
    return common.preview(appState, asset)
}


export function getActions(asset: Asset) {

    return {
        class: "w-100 d-flex flex-wrap",
        children: {}
    }
}


export class PackageTabView extends AssetTabView {

    constructor(public readonly asset: AssetWithAccessInfo, public readonly appState: AppState) {
        super("package", "Package info", asset, appState)
    }

    view(): VirtualDOM {

        return {
            class: 'd-flex flex-column p-5 h-100',
            children: [
                child$(
                    AssetsBrowserClient.getPackageMetadata$(this.asset.rawId),
                    (metadata: any) => {

                        return {
                            class:'h-100 fv-text-primary',
                            children: [
                                {
                                    class:'h-100 d-flex flex-column',
                                    children: [
                                        {
                                            class: 'd-flex align-items-center m-3',
                                            children:[
                                                { innerText: "namespace:", class: "px-2" },
                                                { innerText: `${metadata.namespace}`, 
                                                    style: { 'font-family': 'fantasy' } }
                                            ]
                                        },
                                        {
                                            class: 'd-flex align-items-center m-3',
                                            children:[
                                                { innerText: "name:", class: "px-2" },
                                                { innerText: `${metadata.name}`, 
                                                    style: { 'font-family': 'fantasy' } }
                                            ]
                                        },
                                        {
                                            class: 'm-3 flex-grow-1', style:{height:'10px'},
                                            children:[
                                                { innerText: "versions:", class: "px-2" },
                                                { 
                                                    class: 'h-100 overflow-auto',
                                                    children: metadata.versions.map( v => ({
                                                        innerText: v,style: { 'font-family': 'fantasy' } }
                                                    ))}
                                            ]
                                        }
                                    ]
                                },
                            ]
                        }
                    })
                ]
        }
    }
}
