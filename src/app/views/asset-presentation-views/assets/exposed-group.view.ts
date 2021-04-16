
import { Button } from '@youwol/fv-button'
import { AppState } from '../../../app.state'
import { Asset, AssetWithAccessInfo } from '../../../data'
import * as common from './common.view'


export function preview(appState: AppState, asset: AssetWithAccessInfo){
    return common.preview(appState, asset)
}


export function getActions(asset: Asset){

    let presentationBttnState = new Button.State()
    let presentationBttn = new Button.View(
        { state: presentationBttnState, 
          contentView: () => ({innerText:'Presentation'})
        })
    presentationBttnState.click$.subscribe(() => window.location.href = `/ui/flux-ui-runner/?id=${asset.rawId}`)

    return {
        class: "w-100 d-flex flex-wrap",
        children: [
            presentationBttn
        ]
    }
}