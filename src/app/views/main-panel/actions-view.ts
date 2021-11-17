import { child$, children$, VirtualDOM } from '@youwol/flux-view'
import { Button } from '@youwol/fv-button'
import { Observable, of } from 'rxjs'
import { filter, map, mergeMap } from 'rxjs/operators'
import { AppState, SelectedItem } from '../../app.state'
import { AssetsBrowserClient } from '../../assets-browser.client'
import { Nodes } from '../../data'



export class ButtonView extends Button.View {

    class = 'fv-btn fv-bg-secondary-alt fv-hover-bg-secondary'

    constructor({ name, icon, withClass, enabled }: { name: string, icon: string, withClass: string, enabled: boolean }) {
        super({
            state: new Button.State(),
            contentView: () => ({
                class: 'd-flex align-items-center',
                children: [
                    { class: icon },
                    {
                        class: 'ml-1',
                        innerText: name
                    }
                ]
            }),
            disabled: !enabled
        } as any)
        this.class = `${this.class} ${withClass}`
    }
}
export class ActionsView implements VirtualDOM {

    public readonly class = "d-flex flex-column p-2 fv-bg-background-alt border-top h-100"
    public readonly style = {
        minWidth: '200px'
    }
    public readonly children: VirtualDOM[]

    public readonly state: AppState

    constructor(params: { state: AppState }) {
        Object.assign(this, params)

        console.log("create actions view")
        let actionsParentFolder$ = this.state.currentFolder$.pipe(
            mergeMap((folder) => getActions$(this.state, { node: folder, selection: 'indirect' }))
        )
        let actionSelectedItem$ = this.state.selectedItem$.pipe(
            mergeMap((item) => item ? getActions$(this.state, { node: item, selection: 'direct' }) : of([]))
        )
        this.children = [
            {
                class: 'd-flex flex-column',
                children: children$(
                    actionSelectedItem$,
                    (actions: Action[]) => actions.map((action) => this.actionView(action))
                )
            },
            {
                tag: 'br'
            },
            {
                class: 'd-flex flex-column',
                children: children$(
                    actionsParentFolder$,
                    (actions: Action[]) => actions.map((action) => this.actionView(action))
                )
            }
        ]
    }

    actionView(action: Action) {
        let btn = new ButtonView({
            name: action.name,
            icon: action.icon,
            withClass: 'my-1 fv-border-primary',
            enabled: action.enable
        })
        btn.state.click$.subscribe(() => action.exe())
        return btn
    }

}




export interface Action {
    icon: string
    name: string,
    enable: boolean,
    exe: () => void,
    applicable: (BrowserNode, any) => boolean
}
let ALL_ACTIONS = {
    rename: (state: AppState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-pen',
        name: 'rename',
        enable: true,
        applicable: () => {
            if (!permissions.write || node instanceof Nodes.TrashNode || selection == 'indirect')
                return false
            if (node instanceof Nodes.ItemNode) {
                return !node.borrowed
            }
            return node instanceof Nodes.FolderNode || node instanceof Nodes.DriveNode
        },
        exe: () => { state.toggleRenaming(node) }
    }),
    newFolder: (state: AppState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-folder',
        name: 'new folder',
        enable: permissions.write,
        applicable: () => {
            return selection == 'indirect' && (node instanceof Nodes.FolderNode || node instanceof Nodes.DriveNode || node instanceof Nodes.HomeNode)
        },
        exe: () => { state.newFolder(node as any) }
    }),
    download: (state: AppState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-download', name: 'download file',
        enable: true,
        applicable: () => node instanceof Nodes.DataNode && permissions.write,
        exe: () => {
            let nodeData = node as Nodes.DataNode
            let anchor = document.createElement('a') as HTMLAnchorElement
            anchor.setAttribute("href", `/api/assets-gateway/raw/data/${nodeData.relatedId}`)
            anchor.setAttribute("download", nodeData.name)
            anchor.dispatchEvent(new MouseEvent('click'))
            anchor.remove()
        }
    }),
    deleteFolder: (state: AppState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-trash',
        name: 'delete',
        enable: permissions.write,
        applicable: () => node instanceof Nodes.FolderNode && selection == 'direct',
        exe: () => { state.deleteFolder(node as any) }
    }),
    clearTrash: (state: AppState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-times',
        name: 'clear trash',
        enable: permissions.write,
        applicable: () => node instanceof Nodes.TrashNode,
        exe: () => { state.purgeDrive(node as any) }
    }),
    newFluxProject: (state: AppState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-play',
        name: 'new app',
        enable: permissions.write,
        applicable: () => selection == 'indirect' && node instanceof Nodes.FolderNode,
        exe: () => { state.newFluxProject(node as any) }
    }),
    newStory: (state: AppState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-book',
        name: 'new story',
        enable: permissions.write,
        applicable: () => selection == 'indirect' && node instanceof Nodes.FolderNode,
        exe: () => { state.newStory(node as any) }
    }),
    paste: (state: AppState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-paste',
        name: 'paste',
        enable: permissions.write && state.itemCut != undefined,
        applicable: () => selection == 'indirect' && node instanceof Nodes.FolderNode && permissions.write,
        exe: () => { state.pasteItem(node as Nodes.FolderNode) }
    }),
    cut: (state: AppState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-cut',
        name: 'cut',
        enable: true,
        applicable: () => {
            if (!permissions.write || selection == 'indirect')
                return false
            if (node instanceof Nodes.ItemNode)
                return !node.borrowed

            return node instanceof Nodes.FolderNode
        },
        exe: () => { state.cutItem(node as (Nodes.ItemNode | Nodes.FolderNode)) }
    }),
    importData: (state: AppState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-file-import',
        name: 'import data',
        enable: permissions.write,
        applicable: () => selection == 'indirect' && node instanceof Nodes.FolderNode,
        exe: () => {
            let input = document.createElement('input') as HTMLInputElement
            input.setAttribute("type", "file")
            input.setAttribute("multiple", "true")
            input.dispatchEvent(new MouseEvent('click'))
            input.onchange = (ev) => {
                state.uploadFiles(node as Nodes.FolderNode, input)
                input.remove()
            }
        }
    }),
    deleteItem: (state: AppState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-trash',
        name: 'delete',
        enable: permissions.write,
        applicable: () => node instanceof Nodes.ItemNode,
        exe: () => { state.deleteItem(node as Nodes.ItemNode) }
    }),
    borrow: (state: AppState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-download',
        name: 'borrow item',
        enable: permissions.share,
        applicable: () => {
            return node instanceof Nodes.ItemNode
        },
        exe: () => {
            state.borrowItem(node as Nodes.ItemNode)
        }
    }),
    favorite: (state: AppState, { node, selection }: SelectedItem, permissions) => ({
        icon: 'fas fa-star',
        name: 'add to favorite bar',
        enable: true,
        applicable: () => selection == 'indirect' && node instanceof Nodes.FolderNode,
        exe: () => { state.addFavorite(node as Nodes.FolderNode) }
    }),
}


export function getActions$(state: AppState, item: SelectedItem): Observable<Array<Action>> {

    if (item.node instanceof Nodes.DeletedNode)
        return of([]) // restore at some point

    if (item.node instanceof Nodes.GroupNode) {
        // a service should return permissions of the current user for the group
        // for now, everybody can do everything
        let actions = Object.values(ALL_ACTIONS).map(
            action => action(state, item, { read: true, write: true, share: true })
        )
            .filter(a => a.applicable())
        return of(actions)
    }


    return AssetsBrowserClient.permissions$(item.node instanceof Nodes.TrashNode ? item.node.driveId : item.node.id)
        .pipe(
            map(permissions => ({ state, item: item, permissions })),
            map(({ state, item, permissions }) => {

                return Object.values(ALL_ACTIONS).map(
                    action => action(state, item, permissions)
                )
                    .filter(a => a.applicable())
            })
        )
}
