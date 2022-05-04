import { DockableTabs } from '@youwol/fv-tabs'
import { child$, VirtualDOM, attr$ } from '@youwol/flux-view'
import { LeftNavTopic } from './app.view'
import { Explorer } from '@youwol/platform-essentials'
import { ImmutableTree } from '@youwol/fv-tree'
import { ContextMenu } from '@youwol/fv-context-menu'
import { ContextMenuState } from './context-menu.view'
import { map } from 'rxjs/operators'

export class LeftNavTab extends DockableTabs.Tab {
    protected constructor(params: {
        topic: LeftNavTopic
        state: Explorer.ExplorerState
        content: () => VirtualDOM
        title: string
        icon: string
    }) {
        super({ ...params, id: params.topic })
    }
}

export class UserDriveTab extends LeftNavTab {
    constructor(params: { state: Explorer.ExplorerState }) {
        super({
            topic: 'MySpace',
            title: 'My space',
            icon: 'fas fa-user',
            state: params.state,
            content: () => {
                return child$(
                    params.state.defaultUserDrive$,
                    (defaultUserDrive) => {
                        return new TreeViewDrive({
                            explorerState: params.state,
                            groupId: defaultUserDrive.groupId,
                        })
                    },
                )
            },
        })
        Object.assign(this, params)
    }
}

export class TreeViewDrive extends ImmutableTree.View<Explorer.BrowserNode> {
    public readonly explorerState: Explorer.ExplorerState

    public readonly connectedCallback = (elem) => {
        return new ContextMenu.View({
            state: new ContextMenuState({
                appState: this.explorerState as any,
                div: elem,
                item$: this.state.selectedNode$.pipe(map((folder) => folder)),
            }),
            class: 'fv-bg-background border fv-color-primary fv-text-primary',
            style: {
                zIndex: 20,
            },
        } as any)
    }

    constructor(params: {
        explorerState: Explorer.ExplorerState
        groupId: string
    }) {
        super({
            state: params.explorerState.groupsTree[params.groupId], //new TreeViewState(params),
            headerView,
            options: {
                classes: {
                    header: 'd-flex align-items-baseline fv-tree-header fv-hover-bg-background-alt rounded',
                },
            },
            dropAreaView: () => ({ class: 'w-100 my-1' }),
        })
        Object.assign(this, params)
        this.explorerState.openFolder$.subscribe((d) => {
            this.state.selectedNode$.next(d.folder)
            const expanded = this.state.expandedNodes$.getValue()
            if (!expanded.includes(d.folder.id)) {
                this.state.selectNodeAndExpand(d.folder)
            }
        })
    }
}

export function headerView(
    state: Explorer.TreeGroup,
    item: Explorer.BrowserNode,
) {
    if (
        item instanceof Explorer.ItemNode ||
        item instanceof Explorer.FutureItemNode ||
        item instanceof Explorer.DeletedItemNode
    ) {
        return undefined
    }

    return {
        class: attr$(
            state.selectedNode$,
            (folder): string => {
                return folder.id == item.id ? 'fv-text-focus' : ''
            },
            {
                wrapper: (d) =>
                    `${d} d-flex align-items-center fv-pointer w-100`,
            },
        ),
        children: [
            {
                class: `${item.icon} mr-2`,
            },
            {
                innerText: item.name,
            },
        ],
        onclick: () => {
            state.explorerState.openFolder(item as Explorer.RegularFolderNode)
        },
    }
}
