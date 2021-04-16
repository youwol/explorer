/*
import { Button, ExpandableGroup, Modal, Select } from "@youwol/flux-lib-views"
import { BehaviorSubject, Subject } from "rxjs"
import { map, mergeMap } from "rxjs/operators"
import { Asset, Nodes } from "../data"
import { createCards } from "./panel-assets-list.view"
import { BrowserState } from './panel-browser.state'
import * as FluxLibCore from "@youwol/flux-core"
import { AssetsBrowserClient } from '../assets-browser.client'


class AssetType{
    public readonly id : string
    public readonly name : string
}

class SelectAreaState extends ExpandableGroup.State{

    assetTypes : Array<AssetType> = [
        {name: "Wol App", id: "flux-project" },
        { name: "Modules Boxes", id: "flux-pack" }
    ]

    selectedAssetType$ = new BehaviorSubject<AssetType>({ name: "Wol App", id: "flux-project" })

    selectTypeState = new Select.State(this.selectedAssetType$, this.assetTypes)

    selectedItems$ = new BehaviorSubject<Array<Asset>>([])

    constructor(){
        super("ASSETS SELECTION", new BehaviorSubject<boolean>(true))
    }
}

export function simpleGroupHeader(state: ExpandableGroup.State, expandable: boolean) {

    return {
        class: 'yw-bg-primary px-2 rounded',
        children: {
            base: {
                class: 'd-flex align-items-center yw-pointer',
                children: {
                    expandIcon: expandable
                        ? { tag: 'i', class: state.expanded$.pipe(map(d => d ? "fas fa-caret-down" : "fas fa-caret-right")) }
                        : {},
                    title: { tag: 'span', class: 'px-2 yw-text-enabled', innerText: state.name },
                }
            }
        }
    }
}

function headerSelectAssetView(state: SelectAreaState) {

    return {
        class: 'yw-bg-primary px-2 rounded',
        children: {
            base: {
                class: 'd-flex align-items-center yw-pointer',
                children: {
                    title: { tag: 'span', class: 'px-2 yw-text-enabled', innerText: "ASSETS SEARCH" },
                    filter: {
                        class: 'yw-bg-dark ml-3 mr-2 my-1 d-flex align-items-center rounded', style: { 'font-size': 'small' },
                        children: {
                            selectTypes: new Select.View(state.selectTypeState).data
                        },
                        onclick: (ev) => ev.stopPropagation()
                    },
                }
            }
        }
    }
}
function pathDiv(elems, i)  {
    return i == elems.length ? {} : {
        class: 'px-2',
        children: {
            header: {
                class: 'd-flex align-items-center',
                children: {
                    expand: { tag: 'i', class: 'fas fa-caret-down px-1' },
                    name: { innerText: elems[i], }
                }
            },
            next: pathDiv(elems, i + 1)
        }
    }
}

function sideBarView(selectedItems$: BehaviorSubject<Array<Asset>>,
    ok$ : Subject<any>, cancel$: Subject<any>, pathElements){

    let stateSideBar = new ExpandableGroup.State("TO IMPORT", new BehaviorSubject(true))

    let okBttnView = new Button.View(new Button.State(ok$), { text: 'Import', classes: 'yw-bg-primary yw-text-light my-3 mx-1' })
    let cancelBttnView = new Button.View(new Button.State(cancel$), { text: 'Cancel', classes: 'yw-bg-primary yw-text-light my-3 mx-1' })
    
    let select = (asset) => {
        let selecteds = selectedItems$.getValue()
        selectedItems$.next(selecteds.includes(asset)
            ? selecteds.filter(e => e.assetId != asset.assetId)
            : selecteds.concat([asset])
        )
    }

    let contentSideBar = () => {
        return selectedItems$.pipe(map((selecteds) => {
            return {
                class: 'yw-text-enabled px-2 py-2 d-flex flex-column',
                children: {
                    path: {
                        class: ' yw-text-light', style: { 'font-family': 'monospace' },
                        children: {
                            title: { innerText: 'Import in folder:' },
                            path: pathDiv(pathElements, 0)
                        }
                    },
                    suggestion: {
                        class: 'py-2',
                        innerHtml: selecteds.length == 0 ? 'Select elements to import from the right panel' : ''
                    },
                    list: {
                        children: selecteds.map(selected => {
                            return {
                                class: 'd-flex align-items-center',
                                children: {
                                    title: { innerText: selected.name, style: { select: 'none' } },
                                    remove: { tag: 'i', class: 'px-2 fas fa-times yw-pointer yw-hover-opacity', 
                                    onclick: () => select(selected) }
                                }
                            }
                        })
                    },
                    buttons: {
                        class: 'd-flex',
                        children: {
                            validate: selecteds.length > 0 ? okBttnView.data : {},
                            cancel: cancelBttnView.data
                        }
                    }
                }

            }
        }))
    }

    let expandableGroupSideBar = new ExpandableGroup.View(
        stateSideBar,
        { contentView: contentSideBar, headerView: (state) => simpleGroupHeader(state, false) },
        { classes: 'yw-text-light h-100', style: { 'font-family': 'math' } })

    return expandableGroupSideBar
}


function selectAreaView(stateMainArea:SelectAreaState) {
    
    let isSelected$ = (item: Asset) => stateMainArea.selectedItems$.pipe(map(selecteds => {
        return selecteds.find(selected => selected.assetId == item.assetId) != undefined
    }))

    let select = (asset: Asset) => {
        let selecteds = stateMainArea.selectedItems$.getValue()
        stateMainArea.selectedItems$.next(selecteds.includes(asset)
            ? selecteds.filter(e => e.assetId != asset.assetId)
            : selecteds.concat([asset])
        )
    }
    return {
        class: 'overflow-auto w-100 ',
        style: { 'max-height': '75vh' },
        children: {
            cards: stateMainArea.selectedAssetType$.pipe(

                mergeMap( (assetType) => {
                    return assetType.id == "flux-project"
                        ? AssetsBrowserClient.fluxProjectAssets$().pipe(map( ({assets}) => ({assets, assetType })))
                        : AssetsBrowserClient.modulesBoxAssets$().pipe(map( ({assets}) => ({assets, assetType })))
                }),
                map(({ assets, assetType} : {assets: Array<Asset>, assetType: AssetType}) => {
                    let bgColor = assetType.id=="flux-pack"? "yw-bg-light" : ""
                    return createCards(assets, isSelected$, select, bgColor)
                }))
        }
    }  
}

export function modalImportAssets(state: BrowserState, node: Nodes.FolderNode) {

    let stateMainArea = new SelectAreaState()
    let modalState = new Modal.State()

    modalState.ok$.subscribe(() => {
        state.importAssets(node, stateMainArea.selectedItems$.getValue())
    })

    let expandableGroupSideBar = sideBarView(stateMainArea.selectedItems$, modalState.ok$, modalState.cancel$, 
        state.reducePath(node, (node) => node.name))
    
    let expandableGroupSelectArea = new ExpandableGroup.View(
        stateMainArea,
        { contentView: selectAreaView, headerView: headerSelectAssetView },
        { classes: 'yw-text-light h-100', style: { 'font-family': 'math' } })


    let contentView = (state) => {

        return {
            class: 'yw-bg-dark yw-text-light p-3 w-75 h-75 d-flex', style: { border: 'solid' },
            children: {
                sideBar: {
                    class: 'w-25 mr-2',
                    children: {
                        grp: expandableGroupSideBar.data
                    }

                },
                itemsPanel: {
                    class: 'w-75',
                    children: {
                        grp: expandableGroupSelectArea.data
                    }
                }
            }
        }
    }
    let view = new Modal.View(modalState, { style: { 'background-color': 'rgba(255,255,255,0.4)' } }, contentView)
    modalState.ok$.subscribe(() => {
        view.element.remove()
    })
    modalState.cancel$.subscribe(() => {
        view.element.remove()
    })
    return view
}
*/