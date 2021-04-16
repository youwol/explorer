//import { Switch } from "@youwol/fv-input";
import {ExpandableGroup} from '@youwol/fv-group'
import { BehaviorSubject, merge } from "rxjs";
import { map, withLatestFrom } from "rxjs/operators";
import { AppState } from '../app.state';
import {attr$, child$} from '@youwol/flux-view'
import {Switch} from '@youwol/fv-button'

class GroupState extends ExpandableGroup.State{

    constructor(name, expanded$, public readonly appState: AppState ) {
        super(name,expanded$)
    }
}

function headerGroupView( state: GroupState) {

    let filterDetails = new BehaviorSubject<boolean>(false)

    let baseClassesDetail = "fas fa-angle-double-down px-2 fv-hover-opacity"
    
    let toggleRecState = new Switch.State(state.appState.recursiveSearch$.getValue())
    let sub = toggleRecState.value$.subscribe( toggled => state.appState.recursiveSearch$.next(toggled)) 
    let toggleView = new Switch.View({
        state:toggleRecState,    
        connectedCallback: (elem) => elem.subscriptions.push(sub)
    } as any )
    
    return {
        class: 'fv-bg-background-alt px-2 rounded',
        onclick: (ev) => { 
             ev.stopPropagation()
        },
        children: [
            {
                class: 'd-flex align-items-center fv-pointer',
                children: [
                    { tag: 'span', class: 'px-2 fv-text-focus', innerText: state.name },
                    {
                        class: attr$(
                            filterDetails,
                            expanded => expanded ? "fv-color-focus" : "",
                            {wrapper: (d) => `${baseClassesDetail} ${d}`}
                        ),
                        onclick: (ev) => { 
                            filterDetails.next(!filterDetails.getValue());
                             ev.stopPropagation()}
                    },
                    {
                        class: 'fv-bg-background ml-3 mr-2 my-1 d-flex align-items-center rounded', style: { 'font-size': 'small' },
                        children: [
                            {
                                children: [
                                    { tag: 'i', class: 'fas fa-filter tw-text-light px-1' },
                                    { tag: 'input', class: 'm-1 fv-bg-background fv-color-primary', type: 'text', style: { border: 'black', padding: '0px' } }
                                ],
                                onclick: (ev) => ev.stopPropagation()
                            }
                        ]
                    },
                    {
                        class:"d-flex align-items-center px-3",
                        children:[
                            {   tag:'span', 
                                class: attr$(
                                    toggleRecState.value$,
                                    toggled => toggled? "fv-text-focus" : "fv-text-disabled",
                                    {wrapper: (d) => "px-1 "+d}
                                ), 
                                innerText:'recursive'
                            },
                            toggleView 
                        ]
                    }
                ]
            },
            child$ (
                filterDetails,
                expanded => expanded
                    ? { class: 'fv-text-focus w-100 text-center', tag: 'i', innerText: 'Here will come advanced filtering options' }
                    : {}
            )
        ]
    }
}

function createPanel(appState: AppState, title: string, contentView: (state) => any) {

    let state = new GroupState(title, new BehaviorSubject(true), appState)

    let baseClasses = 'fv-text-primary mx-1 w-100 d-flex flex-column'

    let expandableGroup = new ExpandableGroup.View(
        {   state, 
            contentView, 
            headerView: headerGroupView,
            class:attr$(
                appState.selectedAsset$,
                item => item ? 'h-50': "h-100",
                { wrapper: (d) => `${baseClasses} ${d}` }
            ),
            style: { 'font-family': 'math' , 'max-height':'100%'}
        } as any
    )
    return expandableGroup
}


export function createCardsPanel( state: AppState) {

    let isSelected$ = (item) => state.selectedAsset$.pipe( map( _item => {
        return _item && item.assetId == _item.assetId 
    }))
    let select = (asset) => {
        state.selectedAsset$.next(asset)
    }
    let items$ = state.updatedAsset$.pipe(
        withLatestFrom( state.items$ ),
        map( ([assetUpdated, assets]) => {
            let assets2 = assets.map( asset => asset.assetId == assetUpdated.assetId ? assetUpdated : asset )
            return assets2
        })
    )
    let contentView = () => {

        return {
            class: "w-100 p-3 h-25 border mb-2 overflow-auto flex-grow-1 fv-text-background",

            onclick : () => state.selectedAsset$.next(undefined),
            children: [
                child$( 
                    merge(state.items$, items$),
                    ( assets ) => createCards(assets, isSelected$, select ) 
                )
            ]
        }
    }

    return createPanel(state, 'ASSET SEARCH', contentView )
}

function getIcon(asset){
    if(asset.kind == "flux-project")
        return 'fas fa-play'
    if(asset.kind == 'exposed-group')
        return 'fas fa-users'
    if(asset.kind == 'data')
        return 'fas fa-file'
}

export function createCards(container, isSelected$, select, bgColorClass = "" ){

    return {
        class: "w-100 d-flex flex-wrap justify-content-around",
        children: container.map( item => { 
            
            return {
                tag: 'div',
                class:  attr$(
                    isSelected$(item),
                    isSelected => isSelected ? " selected" : "",
                    {wrapper: (d) => `m-1 fv-bg-background flux-project-card fv-pointer ${d}` }
                ),  
                style:{'box-shadow': '10px 5px 5px black', position:'relative'},
                onclick : (ev) => {select(item); ev.stopPropagation() },
                children:[
                    {
                        class:"d-flex justify-content-center "+ bgColorClass, 
                        style:{width:'250px', height: '250px'},
                        children:[ 
                            item.thumbnails[0] 
                            ? {                             
                                tag: 'img', class: "", src: item.thumbnails[0], 
                                style:{'margin-top':'auto', 'margin-bottom':'auto', transform:'scale(1.25)'} }                            
                            : {}
                        ]
                    },
                    {
                        class:'w-100 h-25 fv-text-primary  d-flex align-items-center', 
                        style:{ position:'absolute', top:'75%', 'background-color': 'rgba(0,0,0,0.7)'},
                        children: [
                            { class: getIcon(item)+ " mx-2 fv-text-focus" },
                            { 
                                class:'text-center mx-2',
                                innerText: item.name, 
                                style:{ 'margin-top':'auto', 'margin-bottom':'auto', 'font-family':'fantasy', 'font-size':'larger' } 
                            } 
                        ]
                    }
                ]
            } 
        })
    }
}
