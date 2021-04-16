import { BehaviorSubject, timer } from "rxjs";
import { distinctUntilChanged,filter, map, mergeMap, skip, takeUntil } from "rxjs/operators";
import { Asset, Favorite, Nodes, UploadStep } from "../data";
import { Action, getActions$ } from './panel-browser.actions';
import { AssetsBrowserClient } from '../assets-browser.client';
import { AppState } from '../app.state';
import { BrowserState } from './panel-browser.state';

import {ExpandableGroup} from '@youwol/fv-group'
import {render, attr$, child$, VirtualDOM} from '@youwol/flux-view'
import {ImmutableTree} from '@youwol/fv-tree'


export function createYouwolBrowserPanel(appState: AppState) {

    let state = new ExpandableGroup.State('EXPLORER', true)
    let view = new ExpandableGroup.View({
        state,
        headerView:headerViewBrowserGroup,
        contentView: () => createBrowserView(appState),
        className:"h-100 d-flex flex-column"
    } as any)
    return view
}


export function createBrowserView(appState: AppState) {

    let tree = new ImmutableTree.View<Nodes.BrowserNode>({
        state: appState, 
        id: 'browser-tree-view',
        headerView: headerViewTree,
        class:'fv-text-primary',
        options:{
            stepPadding:20
        },
        connectedCallback: (elem) => {

            let sub0 = appState.selectedNode$.pipe( 
                filter( (node) => node instanceof Nodes.FolderNode)
            ).subscribe(
                (node: Nodes.FolderNode) =>{
                    appState.selectedFolder$.next(node) 
                }
            )
            let sub1 = appState.selectedNode$.pipe(
                filter( (node) => node instanceof Nodes.DriveNode)
            ).subscribe(
                (node: Nodes.DriveNode) =>{
                    appState.selectedDrive$.next(node) 
                }
            )
            let sub2 = tree.contextMenu$.pipe(
                mergeMap( ({data, event}) =>  
                    getActions$(appState, data.node).pipe(map( actions => ({actions,event}) ))
                )
            ).subscribe(({actions, event}) => {
                console.log(event, actions)
                contextMenuView(actions, event)
            })
            let sub3 = appState.selectedNode$.pipe(
                filter((node) => node instanceof Nodes.ItemNode),
                mergeMap((node: Nodes.ItemNode) => {
                    return AssetsBrowserClient.getAsset$(node.assetId).pipe(map(assetData => ({ assetData, treeId: node.id })))
                })
            ).subscribe(
                ({ treeId, assetData }) => {
                    let asset = new Asset({ ...assetData, ...{ treeId } })
                    appState.selectedAsset$.next(asset)
                }
            )
            elem.subscriptions.push( sub0, sub1, sub2, sub3)
        }
        
    }as any)

    appState['view'] = tree

    return {
        class: 'h-100 overflow-auto d-flex justify-content-between',
        children: [
            tree,
            favoritesBar(appState, tree )
        ]
    }
}

export function favoritesBar(appState: AppState, tree: ImmutableTree.View<Nodes.BrowserNode>) {

    let favorites$ = appState.favorites$.pipe(
        distinctUntilChanged( (prev,cur) => prev.reduce( (a,b)=> a+b.assetId, "") == cur.reduce( (a,b)=> a+b.assetId, ""))
    )
    return {
        class:"favorite-bar d-flex flex-column",
        style: attr$(
            appState.favorites$,
            (favorites) => {
                return favorites.length>0 
                    ? { width: "100px", height: "fit-content"/*, 'position':'absolute', top:'0px', right:'0'*/}
                    : { width: "25px", height: "fit-content"/*,'position':'absolute', top:'0px', right:'0' */}
            }
        ),
        onmouseenter: () => { appState.expandFavoritesBar()},
        onmouseleave: () => {

            let timeout = 500
            let reflow$ = appState.favorites$.pipe(  
                skip(1),
                takeUntil(timer(timeout))
            )
            timer(timeout).pipe(
                takeUntil( reflow$ )
            ).subscribe( () => appState.collapseFavoritesBar())
        },
        children: [
            {
                class :'py-2 fv-text-focus  text-center px-2',
                children:[
                    {
                        tag: 'i',
                        class: 'fas fa-star py-1 float-right' 
                    }
                ],
            },
            child$( 
                favorites$,
                favorites => {
                    return {
                        class: 'w-100 favorite-bar-container favorites-container',
                        children: favorites.map( (favorite: Favorite) => {
                           let onclick = () => {
                                AssetsBrowserClient.getAsset$(favorite.assetId).subscribe( data => {
                                    appState.selectedAsset$.next(new Asset(data))
                                })
                            }
                            let content = (favorite.imageSrc)
                                ? {
                                    tag: 'img', class: 'd-flex justify-content-center w-100',
                                    style: { "margin-top": "auto", "margin-bottom": "auto" },
                                    src: favorite.imageSrc,
                                    onclick
                                }
                                : {
                                    innerText: favorite.name, class:" py-2 w-100 ",
                                    style: { "margin-top": "auto", "margin-bottom": "auto", 'font-size':'small'},
                                    onclick                                
                                }
                            return {
                                class: "w-100 fv-pointer  text-center my-2  fv-text-background fv-bg-primary favorite-item",
                                children:[
                                    content
                                ]
                            }
                        })
                    }

                }
            )
            
        ]
    }
}

export function headerRenamed(node: Nodes.DriveNode | Nodes.FolderNode | Nodes.ItemNode, state: AppState) {

    return {
        tag: 'input', type: 'text', autofocus: true, style: { "z-index": 200 }, class: "mx-2", data: node.name,
        onclick: (ev) => ev.stopPropagation(),
        onkeydown: (ev) => {
            if (ev.key === 'Enter')
                state.rename(node, ev.target.value)
        }
    }
}


export function simpleHeader(state: AppState, faIcon, node: Nodes.BrowserNode) {

    let style = {}
    if (node instanceof Nodes.ItemNode && node.borrowed) {
        style = { 'font-family': 'monospace', 'color': 'khaki' }
    }
    return {
        class: 'd-flex w-100 align-items-baseline fv-pointer',
        children: [
            { tag: 'i', class: faIcon },
            {
                tag: 'span', class: 'mx-2 w-100',
                innerText: node.name,
                style: attr$( 
                    node.status$,
                    (statusList) => {
                        return statusList.find(status => status.type == "cut")
                            ? { ...{ 'user-select': 'none', 'opacity': 0.5 }, ...style }
                            : { ...{ 'user-select': 'none', 'opacity': 1 }, ...style }
                    }
                )
            },
            child$(
                node.status$,
                (statusList) =>
                    statusList.find(status => status.type == 'request-pending')
                        ? { tag: 'i', class: 'fas fa-cog fa-spin' }
                        : {}
            )
        ]
    } 
}



export function progressHeader(state: BrowserState, node: Nodes.ProgressNode) {

    return {
        class: 'd-flex w-100 align-items-baseline fv-pointer',
        children: [
            {
                tag: 'i', 
                class: attr$(
                    node.progress$,
                    p => p.step == UploadStep.SENDING
                        ? "fas fa-cloud-upload-alt fv-text-focus"
                        : "fas fa-cog fa-spin fv-text-disabled"
                )
            },
            {
                children: [
                    {
                        tag: 'span', class: 'mx-2 w-100 fv-text-disabled',
                        innerText: node.name,
                    },
                    {
                        class: "d-flex fv-bg-primary",
                        children: [
                            {
                                style: attr$(
                                    node.progress$,
                                    p => ({ width: "" + p.percentSent + "%", 
                                            height: "5px", 'background-color': 'green'
                                            })
                                )
                            },
                            { class: "flex-grow-1" }
                        ]
                    }
                ]
            }
        ]
    } as VirtualDOM
}

export function headerViewTree(state: AppState, node: Nodes.BrowserNode): VirtualDOM {

    if (node instanceof Nodes.RootNode)
        return simpleHeader(state, "fas fa-users", node)

    if (node instanceof Nodes.GroupNode)
        return simpleHeader(state, "fas fa-users", node)

    if (node instanceof Nodes.DriveNode)
        return child$(
            node.status$,
            statusList => statusList.find(s => s.type == 'renaming')
            ? headerRenamed(node, state)
            : simpleHeader(state, "fas fa-hdd", node)
        )

    if (node instanceof Nodes.FolderNode)
        return child$(
            node.status$,
            statusList => statusList.find(s => s.type == 'renaming')
            ? headerRenamed(node, state)
            : simpleHeader(state, "fas fa-folder", node)
        )

    if (node instanceof Nodes.FluxProjectNode)
        return child$(
            node.status$,
            statusList => statusList.find(s => s.type == 'renaming')
            ? headerRenamed(node, state)
            : simpleHeader(state, "fas fa-play", node)
        )

    if (node instanceof Nodes.FluxPackNode)
        return simpleHeader(state, "fas fa-box", node)

    if (node instanceof Nodes.PackageNode)
        return simpleHeader(state, "fas fa-box", node)

    if (node instanceof Nodes.TrashNode)
        return simpleHeader(state, "fas fa-trash", node)

    if (node instanceof Nodes.DeletedFolderNode)
        return simpleHeader(state, "fas fa-folder", node)

    if (node instanceof Nodes.DeletedItemNode)
        return simpleHeader(state, "fas fa-item", node)

    if (node instanceof Nodes.ExposedGroupNode)
        return simpleHeader(state, "fas fa-users", node)

    if (node instanceof Nodes.DataNode)
        return simpleHeader(state, "fas fa-file", node)

    if (node instanceof Nodes.ProgressNode)
        return progressHeader(state, node)
}


export function headerViewBrowserGroup(state: ExpandableGroup.State) {

    let filterDetails = new BehaviorSubject<boolean>(false)

    let baseClassesDetail = "fas fa-angle-double-down px-2 fv-hover-opacity"
    return {
        class: 'fv-bg-background-alt px-2 rounded',
        children: [
            {
                class: 'd-flex align-items-center fv-pointer',
                children: [
                    {   tag: 'i', class: attr$( state.expanded$, d => d ? "fas fa-caret-down" : "fas fa-caret-right") },
                    {   tag: 'span', class: 'px-2 fv-text-focus', innerText: state.name },
                    {
                        class: attr$(
                            filterDetails, 
                            expanded => expanded ? 'fv-text-focus' : 'fv-text-primary', 
                            { wrapper:(d)=>baseClassesDetail+" "+d }),
                        onclick: (ev) => { 
                            filterDetails.next(!filterDetails.getValue()); ev.stopPropagation() 
                        }
                    },
                    {
                        class: 'fv-bg-background fv-text-primary ml-3 mr-2 my-1 d-flex align-items-center rounded', style: { 'font-size': 'small' },
                        children: [
                            {
                                children: [
                                    { tag: 'i', class: 'fas fa-filter px-1' },
                                    { tag: 'input', class: 'm-1 fv-bg-background fv-text-primary', type: 'text', style: { border: 'black', padding: '0px' } },
                                ],
                                onclick: (ev) => ev.stopPropagation()
                            }
                        ]
                    }
                ]
            },
            child$(
                filterDetails,
                expanded => {
                return expanded
                    ? { 
                        class: 'fv-text-focus w-100 text-center', 
                        tag: 'i', 
                        innerText: 'Here will come advanced filtering options' }
                    : {}
            })
        ]
    }
}


function contextMenuView(actions: Array<Action>, ev: MouseEvent ){

    let actionView = (text, faClass) => ({
        class: 'd-flex align-items-center',
        children: [
            { tag: 'i', class: faClass },
            { tag: 'span', class: 'mx-3', innerText: text, style: { 'user-select': 'none' } }
        ]
    })
    
    let div = undefined
    let vDOM = {
        class: 'py-1 fv-bg-background-alt fv-text-primary position-absolute',
        style: { 
            top: `${ev.clientY - 25}px`, 
            left: `${ev.clientX - 25}px` 
        },
        onmouseleave: () => div.remove(),
        children: actions.map(action => ({
            class: 'px-3 fv-hover-text-focus fv-pointer',
            children: [actionView(action.name,action.icon)],
            onclick: () => { action.exe(); div.remove() }
        }))
    }
    div = render(vDOM)
    document.body.appendChild(div)
}
