import { Tabs } from "@youwol/fv-tabs";
import { VirtualDOM } from '@youwol/flux-view';
import { AppState } from '../../app.state';
import { AssetWithAccessInfo } from '../../data';



export abstract class AssetTabView extends Tabs.TabData{

    titleClass = "w-100 text-center"
    titleStyle = { 'font-family': 'fantasy', 'font-size': 'large' }
    classSection = 'py-2'

    constructor(id: string, name: string, public readonly asset: AssetWithAccessInfo, public readonly appState: AppState) {
        super(id,name)
    }

    abstract view() : VirtualDOM
}
