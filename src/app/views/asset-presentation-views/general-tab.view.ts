import { BehaviorSubject, Subject } from 'rxjs'
import { AppState } from '../../app.state'
import { Asset, AssetWithAccessInfo } from '../../data'
import { AssetTabView } from "./data"
import { child$, VirtualDOM } from '@youwol/flux-view'
import * as Data from './assets/data.view'
import * as ExposedGroup from './assets/exposed-group.view'
import * as FluxProject from './assets/flux-project.view'
import * as FluxPack from './assets/flux-pack.view'
import { filter, map } from 'rxjs/operators'


let viewFactory = {
    'data': (appState: AppState, asset: AssetWithAccessInfo) => Data.preview(appState, asset),
    'group-showcase': (appState: AppState, asset: AssetWithAccessInfo) => ExposedGroup.preview(appState, asset),
    'flux-project': (appState: AppState, asset: AssetWithAccessInfo) => FluxProject.preview(appState, asset),
    'flux-pack': (appState: AppState, asset: AssetWithAccessInfo) => FluxPack.preview(appState, asset),
    'package': (appState: AppState, asset: AssetWithAccessInfo) => FluxPack.preview(appState, asset),
    'drive-pack': (appState: AppState, asset: AssetWithAccessInfo) => Data.preview(appState, asset)
}

let actionFactory = {
    'data': (asset: Asset) => Data.getActions(asset),
    'group-showcase': (asset: Asset) => ExposedGroup.getActions(asset),
    'flux-project': (asset: Asset) => FluxProject.getActions(asset),
    'flux-pack': (asset: Asset) => FluxPack.getActions(asset),
    'package': (asset: Asset) => FluxPack.getActions(asset),
    'drive-pack': (asset: Asset) => Data.getActions(asset)
}

export class GeneralTabView extends AssetTabView {

    constructor(asset, appState) {
        super("general", "General", asset, appState)
    }

    view(): VirtualDOM {

        let selectedSnippet$ = new BehaviorSubject<number>(0)
        selectedSnippet$.next(0)

        let presentation = viewFactory[this.asset.kind](this.appState, this.asset)
        let contentView = {
            class: "w-100 p-3 h-100 overflow-auto fv-text-primary d-flex",
            children: [
                presentation.snippets,
                {
                    class: 'flex-grow-1 d-flex',
                    children: [
                        presentation.view,
                        textColumn(this.appState, this.asset)
                    ],
                }
            ]
        }
        return contentView
    }
}



function textColumn(appState: AppState, asset: AssetWithAccessInfo) {

    return {
        class: 'w-50 d-flex flex-column px-4',
        children: [
            title(appState, asset),
            actionFactory[asset.kind](asset),
            tags(appState, asset),
            description(appState, asset)
        ]
    }
}

function editBttn(edition$: Subject<boolean>) {

    return {
        tag: 'i',
        class: 'fas fa-pen px-2',
        onclick: () => {
            edition$.next(true)
        }
    }
}

function updateBttn(appState: AppState, asset: Asset, attName: string, edition$: Subject<boolean>,
    value$: BehaviorSubject<string | Array<string>>) {

    return {
        tag: 'i',
        class: 'fas fa-check px-2',
        onclick: () => {
            edition$.next(false)
            let newAsset = Object.assign({}, asset, { [attName]: value$.getValue() })
            appState.updateAsset(asset, newAsset)
        }
    }
}

function title(appState: AppState, asset: AssetWithAccessInfo) {

    let edition$ = new BehaviorSubject<boolean>(false)
    let value$ = new BehaviorSubject<string>(asset.name)
    return child$(
        edition$,
        edited => {
            return edited
                ? {
                    class: 'd-flex align-items-center py-2',
                    children: [
                        {
                            tag: 'input',
                            class: 'w-100 text-center fv-text-on-background',
                            value: asset.name,
                            style: { 'font-size': 'x-large' },
                            onchange: (ev) => { value$.next(ev.target.value) }
                        },
                        updateBttn(appState, asset, 'name', edition$, value$)
                    ]
                }
                : {
                    class: 'd-flex align-items-center',
                    children: [
                        {
                            class: 'w-100 text-center fv-text-primary',
                            innerText: asset.name,
                            style: { 'font-size': 'xxx-large' }
                        },
                        child$(
                            asset.accessInfo$.pipe(filter(info => info.consumerInfo.permissions.write)),
                            () => editBttn(edition$)
                        )
                    ]
                }
        }
    )
}

function description(appState: AppState, asset: AssetWithAccessInfo) {

    let edition$ = new BehaviorSubject<boolean>(false)
    let description$ = new BehaviorSubject<string>(asset.description)

    return child$(
        edition$,
        edited => {
            return edited
                ? {
                    class: 'w-100  py-2',
                    children: [
                        {
                            class: 'd-flex align-items-center',
                            children: [
                                {
                                    class: 'fv-text-disabled',
                                    innerText: 'Description',
                                    style: { 'font-size': 'larger' }
                                },
                                updateBttn(appState, asset, 'description', edition$, description$)
                            ]
                        },
                        {
                            tag: 'textarea', class: 'w-100', style: { height: "200px" },
                            innerText: asset.description,
                            oninput: (ev) => {
                                description$.next(ev.target.value)
                            }
                        },
                        {
                            class: 'w-100 text-justify fv-text-primary',
                            innerHTML: description$.pipe(map(description => description)),
                            style: { 'font-size': 'large' }
                        }
                    ]
                }
                : {
                    class: 'w-100  py-2',
                    children: [
                        {
                            class: 'd-flex align-items-center',
                            children: [
                                {
                                    class: 'fv-text-focus',
                                    innerText: 'Description',
                                    style: { 'font-size': 'larger' }
                                },
                                child$(
                                    asset.accessInfo$.pipe(filter(info => info.consumerInfo.permissions.write)),
                                    () => editBttn(edition$)
                                )
                            ]
                        },
                        {
                            class: 'w-100 text-justify fv-text-primary',
                            innerHTML: asset.description,
                            style: { 'font-size': 'large' }
                        }
                    ]
                }
        }
    )
}

function newTagEdition(appState: AppState, asset: AssetWithAccessInfo, newValue$: BehaviorSubject<Array<string>>,
    newTag$: Subject<boolean>) {

    return {
        class: 'd-flex align-items-center',
        children: [
            {
                tag: 'input',
                class: 'border fv-text-background mx-2 px-2',
                value: "",
                onchange: (ev) => newValue$.next(asset.tags.concat([ev.target.value]))
            },
            updateBttn(appState, asset, 'tags', newTag$, newValue$)
        ]
    }
}
function tagView(appState: AppState, asset: AssetWithAccessInfo, tag: string) {

    return {
        class: 'd-flex align-items-center px-2',
        children: [
            {
                class: 'border fv-color-primary mx-1 px-2',
                innerText: tag
            },
            child$(
                asset.accessInfo$.pipe(filter(info => info.consumerInfo.permissions.write)),
                () => ({
                    tag: 'i',
                    class: 'fas fa-times fv-color-primary',
                    onclick: () => {
                        let newAsset = Object.assign({}, asset, { tags: asset.tags.filter(t => t != tag) })
                        appState.updateAsset(asset, newAsset)
                    }
                })
            )

        ]
    }
}

function tags(appState: AppState, asset: AssetWithAccessInfo) {
    let newTag$ = new Subject<boolean>()
    let newValue$ = new BehaviorSubject<Array<string>>(asset.tags)

    return {
        class: 'w-100 py-2',
        children: [
            {
                class: 'd-flex align-items-center',
                children: [
                    {
                        class: 'fv-text-focus',
                        innerText: 'Tags',
                        style: { 'font-size': 'larger' }
                    },
                    child$(
                        asset.accessInfo$.pipe(filter(info => info.consumerInfo.permissions.write)),
                        () => ({
                            tag: 'i',
                            class: 'fas fa-plus px-2',
                            onclick: () => {
                                newTag$.next(true)
                            }
                        })
                    )
                ]
            },
            {
                class: 'w-100 text-justify fv-text-primary d-flex flex-wrap my-2',
                children: asset.tags.map((tag) => tagView(appState, asset, tag))
            },
            child$(
                newTag$,
                (editing) => { return editing ? newTagEdition(appState, asset, newValue$, newTag$) : {} }
            )
        ]
    }
}

