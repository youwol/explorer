import { Button } from '@youwol/fv-button'
import { AppState } from '../../../app.state'
import { Asset, AssetWithAccessInfo } from '../../../data'
import * as common from './common.view'


export function preview(appState: AppState, asset: AssetWithAccessInfo) {
    return common.preview(appState, asset)
}

export function getActions(asset: Asset) {
    let classes = 'fv-btn fv-btn-secondary mx-1 '

    let editBttnState = new Button.State()
    let editBttn = new Button.View({
        state: editBttnState, class: classes,
        contentView: () => ({ innerText: 'read' })
    } as any)

    editBttnState.click$.subscribe(() => {
        window.open(`/ui/stories?id=${asset.rawId}`, '_blank').focus();
    })

    return {
        class: "w-100 d-flex flex-wrap",
        children: [
            editBttn
        ]
    }
}
