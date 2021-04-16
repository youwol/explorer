import {Tabs} from "@youwol/fv-tabs"
import { BehaviorSubject} from "rxjs"
import { Asset, AssetWithAccessInfo } from '../../data'
import { AppState } from '../../app.state'
import { AssetTabView } from './data'
import { GeneralTabView } from './general-tab.view'
import { AccessTabView } from './access-tab.view'
import { FluxProjectDependenciesTabView } from './assets/flux-project.view'
import { DataMetadataTabView } from './assets/data.view'
import { PackageTabView } from './assets/flux-pack.view'
import { UsageTabView } from './usage-tab.view'
import { attr$ } from "@youwol/flux-view"


let tabsFactory = {
    'data': (appState: AppState, asset: AssetWithAccessInfo) => [new DataMetadataTabView(asset,appState)],
    'group-showcase': (appState: AppState,asset: AssetWithAccessInfo) => [],
    'flux-project': (appState: AppState,asset: AssetWithAccessInfo) => [new FluxProjectDependenciesTabView(asset, appState)],
    'flux-pack': (appState: AppState,asset: AssetWithAccessInfo) => [new PackageTabView(asset, appState)],
    'package': (appState: AppState,asset: AssetWithAccessInfo) =>  [new PackageTabView(asset, appState)],
    'drive-pack': (appState: AppState, asset: AssetWithAccessInfo) => []
}


export function selectedCardPanel(appState: AppState,  asset: Asset) {

    if (!asset)
        return {}

    let assetWithInfo = new AssetWithAccessInfo(asset)
    let selectedTab$ = new BehaviorSubject<string>("general")
   
    let generalTab = new GeneralTabView(assetWithInfo, appState)
    let accessTab = new AccessTabView(assetWithInfo, appState)
    let usageTab = new UsageTabView(assetWithInfo, appState)

    let tabs = [generalTab,accessTab/*, usageTab*/].concat(tabsFactory[asset.kind](appState,assetWithInfo) )
    
    let tabState = new Tabs.State(tabs, selectedTab$)

    let tabView = new Tabs.View(
        {state: tabState, 
         headerView: ( state: Tabs.State , tabData: AssetTabView) => { 
             return {
                class: attr$(
                    state.selectedId$,
                    selectedId => selectedId == tabData.id ? 'fv-bg-background-alt fv-text-focus' :'fv-bg-background',
                    {wrapper: (d) =>  'px-2 border '+d} 
                ),
                innerText: tabData.name}
        },
         contentView: (state: Tabs.State, tabData: AssetTabView) => tabData.view(),
         class:'h-50 d-flex flex-column mx-1',
         style:{ 'max-height':'50%'}
        } as any)

    return tabView
}

