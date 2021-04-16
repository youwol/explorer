
import { AssetsBrowserClient } from '../../assets-browser.client'
import { AssetTabView } from "./data"
import { distinct, map, withLatestFrom } from 'rxjs/operators'
import { Access, AccessInfo, AssetWithAccessInfo, ExposingGroupAccess } from '../../data'
import { AppState } from '../../app.state'

import { BehaviorSubject, combineLatest, Subject } from 'rxjs'
import { attr$, child$, VirtualDOM } from '@youwol/flux-view'
import {ExpandableGroup} from '@youwol/fv-group'
import {Select} from '@youwol/fv-input'
import { Button } from '@youwol/fv-button'

class ExposedGroupState extends ExpandableGroup.State {

    public readonly groupId: string
    public readonly groupAccess$ : BehaviorSubject<ExposingGroupAccess>
    public readonly loading$ = new BehaviorSubject<boolean>(false)
    public readonly edition$ = new BehaviorSubject<boolean>(false)

    constructor(
        public readonly assetId, 
        public readonly data: ExposingGroupAccess
        ) {
        super(data.name, false)
        this.groupId = data.groupId
        this.groupAccess$ = new BehaviorSubject<ExposingGroupAccess>(data)
    }

    update( body ){
        console.log("Update!", body)
        this.loading$.next(true)
        AssetsBrowserClient.updateAccess$(this.assetId, this.groupId, body )
        .subscribe( groupAccess => {
            this.groupAccess$.next(groupAccess)
            this.loading$.next(false)
            this.edition$.next(false)
        })
    }
    refresh(){
        console.log("refresh!")
        this.loading$.next(true)
        AssetsBrowserClient.accessInfo$(this.assetId)
        .subscribe( info => {
            console.log("Info!!", info, this.groupId)
            let groupAccess = this.groupId == "*" 
                ? info.ownerInfo.defaultAccess
                : info.ownerInfo.exposingGroups.find( g => g.groupId == this.groupId)

            console.log("groupAccess!!", groupAccess)
            this.groupAccess$.next({name:this.name, groupId: this.groupId, access: groupAccess})
            this.loading$.next(false)
            this.edition$.next(false)
        })
    }

}

export class AccessTabView extends AssetTabView {


    titleClass = "w-100 text-center"
    titleStyle = { 'font-family': 'fantasy', 'font-size': 'large' }
    classSection = 'py-2'

    constructor(asset: AssetWithAccessInfo, appState: AppState) {
        super("access", "Access", asset, appState)
    }

    view(): VirtualDOM {
        return {
            children: [
                child$(
                    this.asset.accessInfo$,
                    accessInfo => {
                        return {
                            class: "d-flex w-100 h-100 p-4 fv-text-primary",
                            children: [
                                {
                                    class: "w-50",
                                    children: [
                                        this.commonView(accessInfo)
                                    ]
                                },
                                {
                                    class: "w-50",
                                    children: [
                                        this.ownerView(this.asset.assetId, accessInfo)
                                    ]
                                }
                            ]
                        }
                    }
                )                
            ]
        }
    }

    commonView(data: AccessInfo) {

        return {
            children: [
                {
                    class: this.classSection,
                    children: [
                        {
                            class: this.titleClass, style: this.titleStyle,
                            innerText: 'Owner information',
                        },
                        {
                            innerText: data.owningGroup.name
                        }
                    ]
                },
                {
                    class: this.classSection,
                    children: [
                        {
                            class: this.titleClass, style: this.titleStyle,
                            innerText: 'Your permissions',
                        },
                        {
                            class: 'd-flex align-items-center justify-content-around',
                            children: [
                                {
                                    class: 'd-flex align-items-center ' + (data.consumerInfo.permissions.read
                                        ? 'fv-text-focus' : 'fv-text-disabled'),
                                    children: [
                                        { class: data.consumerInfo.permissions.read ? 'fas fa-check' : 'fas fa-times' },
                                        { class: 'px-2', innerText: 'read' }
                                    ]
                                },
                                {
                                    class: 'd-flex align-items-center ' + (data.consumerInfo.permissions.write
                                        ? 'fv-text-focus' : 'fv-text-disabled'),
                                    children: [
                                        { class: data.consumerInfo.permissions.write ? 'fas fa-check' : 'fas fa-times' },
                                        { class: 'px-2', innerText: 'write' }
                                    ]
                                },
                                data.consumerInfo.permissions.expiration
                                    ? { innertText: data.consumerInfo.permissions.expiration }
                                    : {}
                            ]
                        }
                    ]
                }
            ]
        }
    }

    ownerView(assetId: string, accessInfo: AccessInfo) {

        if (!accessInfo.ownerInfo)
            return {}

        let exposedGrps = accessInfo.ownerInfo.exposingGroups.map((group) => {

            let expState = new ExposedGroupState(assetId, group)
            let expView = new ExpandableGroup.View({ state: expState, contentView, headerView })
            return expView
        })
        let expState = new ExposedGroupState(assetId, {groupId:"*", name:"*", access: accessInfo.ownerInfo.defaultAccess})
        let expView = new ExpandableGroup.View( {state: expState, contentView, headerView })

        return {
            children:[
                {
                    class: this.classSection,
                    children: [
                        {
                            class: this.titleClass, style: this.titleStyle,
                            innerText: 'Default access',
                        },
                        {
                            class: this.classSection,
                            children: [expView]
                        } 
                    ]
                },
                {
                    class: this.classSection,
                    children: [
                        {
                            class: this.titleClass, style: this.titleStyle,
                            innerText: 'Exposing groups',
                        },
                        {
                            class: this.classSection,
                            children: exposedGrps
                        }
                    ]
                }
            ]            
        }
    }
}



function headerView(state: ExposedGroupState) {

    let statusHeader = (key) => ({ 
        tag: 'span', 
        class: 'fv-text-focus', 
        innerText: attr$(
            combineLatest([state.groupAccess$, state.edition$]),
            ([groupAccess, edition]) => {
                console.log("headerView", {key,groupAccess, edition} )
                return edition ? '' : `${key} ${groupAccess.access[key]}` 
            }
        )
    })
    return {
        class: 'fv-bg-background px-2 rounded',
        children: [
            {
                class: 'd-flex align-items-center fv-pointer',
                children: [
                    {
                        tag: 'i',
                        class: attr$(
                            state.expanded$ ,
                            d => d ? "fas fa-caret-down" : "fas fa-caret-right"
                        )
                    },
                    {
                        tag: 'i',
                        class: attr$(
                            state.loading$,
                            d => d ? "fas fa-spinner fa-spin" : ""
                        )
                    },
                    {
                        class: 'd-flex align-items-center w-100',
                        children:[
                            { 
                                tag: 'span', 
                                class: 'px-2 fv-text-focus', 
                                innerText: state.name 
                            },
                            {
                                tag: 'i',
                                class: attr$(
                                    state.edition$,
                                    edition => edition ? '' : 'fas fa-pen px-2 fv-text-focus'
                                ),
                                onclick: (ev) => {
                                    state.edition$.next(true)
                                    state.expanded$.next(true)
                                    ev.stopPropagation()
                                }
                            },
                            {
                                class:'d-flex align-items-center flex-grow-1 fv-text-focus justify-content-around',
                                children:[
                                    statusHeader('read'),
                                    statusHeader('share')
                                ]
                            }
                        ]
                    }
                ]
            }
        ],
        onclick: (ev) => {
            state.expanded$.next(!state.expanded$.getValue())
            ev.stopPropagation()
        }
    }
}

function contentView(state: ExposedGroupState) {

    class Item extends Select.ItemData{
        constructor(id, name, public readonly expiration){
            super(id, name)
        }
    }
    let optionsRead = [
        new Item('forbidden', 'Forbidden', null ),
        new Item('authorized', 'Authorized', null ),
        new Item('expiration-date', 'Expiration-date', Date.now()  )
    ]

    let selectStateRead = new Select.State(optionsRead, state.data.access.read)
    let selectViewRead = new Select.View({state:selectStateRead})

    let optionsShare = [
        new Item('forbidden', 'Forbidden', null ),
        new Item('authorized', 'Authorized', null )
    ]

    let selectStateShare = new Select.State(optionsShare, state.data.access.share)
    let selectViewShare = new Select.View({state:selectStateShare})

    let parameters$ = new BehaviorSubject<any>({})
    
    let bodyPost$ = combineLatest([
        state.groupAccess$.pipe(map( a => a.access)),
        selectStateRead.selection$, 
        selectStateShare.selection$,
        parameters$.pipe(distinct())
    ]).pipe( 
        map( ([initial, read, share, parameters]) => {
            console.log([initial, read, share, parameters])
            let body = {...initial,...{read: read.id},...{share:share.id},...{parameters}}
            return body
        })
    )
        

    let bttnStateOk = new Button.State()
    let bttnViewOk = new Button.View({
        state: bttnStateOk,
        contentView: () => ({innerText:'submit'}),
        class:'fv-btn fv-btn-secondary' 
    } as any)

    bttnStateOk.click$.pipe(
        withLatestFrom(bodyPost$))
    .subscribe( ([_,bodyPost] ) => {
        state.update(bodyPost)
    })

    let bttnStateCancel = new Button.State()
    let bttnViewCancel = new Button.View({
        state:bttnStateCancel,         
        contentView: () => ({innerText:'cancel'}),
        class:'fv-btn fv-btn-secondary' 
    } as any)
    bttnStateCancel.click$.subscribe( () => {
        state.refresh()
    })
    let factory = {
        forbidden : () => ({}),
        authorized : () => ({}),
        'expiration-date': expirationDateAccessView
    }
    return {
        class: 'p-2',
        children: [
            {
                class: 'd-flex align-items-center',
                children:[
                    { innerText: 'read:', class:'px-2'},
                    child$(
                        state.edition$,
                        edition => {
                            return edition 
                                ? selectViewRead 
                                : { 
                                    innerText: attr$(
                                        state.groupAccess$,
                                        groupAccess => groupAccess.access.read 
                                    )
                                } 
                        }
                    )
                ]
            },
            {
                class: 'd-flex align-items-center',
                children:[
                    { innerText: 'share:', class:'px-2'},
                    child$(
                        state.edition$,
                        edition => {
                            return edition 
                                ? selectViewShare 
                                : { innerText: attr$(
                                    state.groupAccess$,
                                    groupAccess => groupAccess.access.share 
                                )} 
                        }
                    )
                ]
            },
            child$(
                combineLatest([bodyPost$, state.edition$]),
                ([access, edition]) => {            
                    return factory[access.read](access, state.edition$, parameters$)
                }
            ),
            child$(
                state.edition$,
                edition => {
                    return edition 
                    ? {
                        class:'py-2',
                        children:[
                            bttnViewOk,
                            bttnViewCancel
                        ]
                    }
                    : {} 
                }
            )
        ]
    }
}

function expirationDateAccessView(access: Access, edition$: BehaviorSubject<boolean>, parameters$ : Subject<any>) {

    return {
        class:'d-flex align-items-center py-2',
        children:[
            {innerText: 'expiration-date:', class:'px-2'},
            child$(
                edition$,
                (editing) => {
                return editing 
                    ? { tag:'input', type:'date', value: access.parameters.expiration,
                        onchange: (ev) => {
                            let period = (ev.target.valueAsNumber - Date.now())/1000
                            parameters$.next({period,expiration:ev.target.value}) 
                        }
                    }
                    : { innerText: access.expiration}
            })
        ]
    }
}