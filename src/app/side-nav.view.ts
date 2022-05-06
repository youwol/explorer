import { DockableTabs } from '@youwol/fv-tabs'
import { attr$, child$, VirtualDOM } from '@youwol/flux-view'
import { LeftNavTopic } from './app.view'
import { Explorer } from '@youwol/platform-essentials'
import { ImmutableTree } from '@youwol/fv-tree'
import { ContextMenu } from '@youwol/fv-context-menu'
import { ContextMenuState } from './context-menu.view'
import { filter, map, mergeMap, take } from 'rxjs/operators'
import { AssetsGateway } from '@youwol/http-clients'
import { BehaviorSubject } from 'rxjs'
import { Select } from '@youwol/fv-input'

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
                        return new GroupView({
                            explorerState: params.state,
                            treeGroup:
                                params.state.groupsTree[
                                    defaultUserDrive.groupId
                                ],
                        })
                    },
                )
            },
        })
        Object.assign(this, params)
    }
}

export class GroupTab extends LeftNavTab {
    constructor(params: {
        state: Explorer.ExplorerState
        group: Explorer.FavoriteGroup
    }) {
        super({
            topic: 'Group',
            title: params.group.path.split('/').slice(-1)[0],
            icon: 'fas fa-map-pin',
            state: params.state,
            content: () => {
                return child$(
                    params.state.selectGroup$(params.group.id),
                    (treeGroup) => {
                        return new GroupView({
                            explorerState: params.state,
                            treeGroup:
                                params.state.groupsTree[treeGroup.groupId],
                        })
                    },
                )
            },
        })
        Object.assign(this, params)
    }
}

export class GroupsTab extends LeftNavTab {
    constructor(params: { state: Explorer.ExplorerState }) {
        super({
            topic: 'Groups',
            title: 'Groups',
            icon: 'fas fa-users',
            state: params.state,
            content: () => {
                return child$(
                    params.state.userInfo$,
                    (userInfo: AssetsGateway.UserInfoResponse) => {
                        return new GroupsTabView({
                            explorerState: params.state,
                            userInfo,
                        })
                    },
                )
            },
        })
        Object.assign(this, params)
    }
}

export class GroupView implements VirtualDOM {
    public readonly children: VirtualDOM[]
    public readonly explorerState: Explorer.ExplorerState
    public readonly treeGroup: Explorer.TreeGroup

    constructor(params: {
        explorerState: Explorer.ExplorerState
        treeGroup: Explorer.TreeGroup
    }) {
        Object.assign(this, params)
        this.children = [
            child$(this.explorerState.favoriteFolders$, (favoritesFolder) => {
                return new FavoritesView({
                    explorerState: this.explorerState,
                    favoritesFolder: favoritesFolder.filter(
                        (f) => f.groupId == this.treeGroup.groupId,
                    ),
                })
            }),
            new TreeViewDrive({
                explorerState: this.explorerState,
                treeGroup: this.treeGroup,
            }),
        ]
    }
}
export class TreeViewDrive extends ImmutableTree.View<Explorer.BrowserNode> {
    public readonly explorerState: Explorer.ExplorerState
    public readonly treeGroup: Explorer.TreeGroup
    static baseWrapperHeaderClass =
        'align-items-baseline fv-tree-header fv-hover-bg-background-alt rounded'
    static wrapperHeaderClassFct = (node) =>
        `${TreeViewDrive.baseWrapperHeaderClass} ${
            node instanceof Explorer.GroupNode ? 'd-none' : 'd-flex '
        }`

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
        treeGroup: Explorer.TreeGroup
    }) {
        super({
            state: params.treeGroup, //params.explorerState.groupsTree[params.groupId], //new TreeViewState(params),
            headerView,
            options: {
                classes: {
                    header: TreeViewDrive.wrapperHeaderClassFct,
                    headerSelected: 'd-flex fv-text-focus',
                },
            },
            dropAreaView: () => ({ class: 'w-100 my-1' }),
        })
        Object.assign(this, params)
        this.treeGroup.expandedNodes$.next([
            this.treeGroup.groupId,
            this.treeGroup.defaultDriveId,
            this.treeGroup.homeFolderId,
        ])
        this.explorerState.openFolder$
            .pipe(
                take(1),
                filter(({ tree }) => tree == this.treeGroup),
            )
            .subscribe((d) => {
                this.treeGroup.selectNodeAndExpand(d.folder)
            })
    }
}

class GroupSelectItemData extends Select.ItemData {
    constructor(public readonly group: AssetsGateway.GroupResponse) {
        super(group.path, group.path.split('/').slice(-1)[0])
    }
}

export class GroupsTabView implements VirtualDOM {
    public readonly class = 'w-100'

    public readonly children: VirtualDOM[]
    public readonly explorerState: Explorer.ExplorerState
    public readonly userInfo: AssetsGateway.UserInfoResponse
    public readonly group$: BehaviorSubject<AssetsGateway.GroupResponse>
    constructor(params: {
        explorerState: Explorer.ExplorerState
        userInfo: AssetsGateway.UserInfoResponse
    }) {
        Object.assign(this, params)
        let sortGroup = (a, b) => (a.path.length < b.path.length ? -1 : 1)

        const displayedGroups = this.userInfo.groups
            .filter((g) => g.path != 'private')
            .sort(sortGroup)

        this.group$ = new BehaviorSubject<AssetsGateway.GroupResponse>(
            displayedGroups[0],
        )
        const itemsData = displayedGroups.map((g) => new GroupSelectItemData(g))

        const selectState = new Select.State(itemsData, itemsData[0].id)
        this.children = [
            {
                class: 'd-flex align-items-center',
                children: [
                    new Select.View({
                        state: selectState,
                        class: 'w-100',
                    } as any),
                    child$(
                        selectState.selection$.pipe(
                            map((s: GroupSelectItemData) => s.group),
                        ),
                        (group) =>
                            new GroupPinBtn({
                                explorerState: this.explorerState,
                                groupId: group.id,
                            }),
                    ),
                ],
            },
            child$(
                selectState.selection$.pipe(
                    mergeMap((item: GroupSelectItemData) =>
                        this.explorerState.selectGroup$(item.group.id),
                    ),
                ),
                (treeGroup) => {
                    return new GroupView({
                        explorerState: this.explorerState,
                        treeGroup,
                    })
                },
            ),
        ]
    }
}

export class GroupPinBtn implements VirtualDOM {
    public readonly children: VirtualDOM[]
    public readonly activated$ = new BehaviorSubject(true)
    public readonly explorerState: Explorer.ExplorerState
    public readonly groupId: string

    public readonly onclick = () => {
        this.explorerState.toggleFavoriteGroup(this.groupId)
    }
    constructor(params: {
        explorerState: Explorer.ExplorerState
        groupId: string
    }) {
        Object.assign(this, params)
        console.log('GroupId', this.groupId)
        const baseClass =
            'fas fa-map-pin p-1 m-1 fv-hover-bg-background-alt rounded fv-pointer'
        this.children = [
            {
                class: attr$(
                    this.explorerState.favoriteGroups$.pipe(
                        map(
                            (groups: Explorer.FavoriteGroup[]) =>
                                groups.find(
                                    (group) => group.id == this.groupId,
                                ) != undefined,
                        ),
                    ),
                    (activated): string => (activated ? 'fv-text-focus' : ''),
                    { wrapper: (d) => `${d} ${baseClass}` },
                ),
            },
        ]
    }
}

export class FavoriteItemView implements VirtualDOM {
    public readonly class =
        'rounded fv-pointer px-1 m-1 fv-bg-background-alt fv-hover-xx-lighter'
    public readonly children: VirtualDOM[]
    public readonly explorerState: Explorer.ExplorerState
    public readonly favoriteFolder: Explorer.FavoriteFolder

    constructor(params: {
        explorerState: Explorer.ExplorerState
        favoriteFolder: Explorer.FavoriteFolder
    }) {
        Object.assign(this, params)

        this.children = [
            {
                class: 'd-flex align-items-center',
                children: [
                    {
                        class: 'fas fa-map-pin mr-2',
                    },
                    {
                        innerText: this.favoriteFolder.name,
                    },
                ],
                onclick: () => {
                    this.explorerState.navigateTo(this.favoriteFolder.folderId)
                },
            },
        ]
    }
}

export class FavoritesView implements VirtualDOM {
    public readonly class = 'w-100 d-flex flex-wrap overflow-auto'
    public readonly style = {
        maxHeight: '25%',
    }
    public readonly children
    public readonly explorerState: Explorer.ExplorerState
    public readonly favoritesFolder: Explorer.FavoriteFolder[]

    constructor(params: {
        explorerState: Explorer.ExplorerState
        favoritesFolder: Explorer.FavoriteFolder[]
    }) {
        Object.assign(this, params)
        this.children = this.favoritesFolder.map((folder) => {
            return new FavoriteItemView({
                explorerState: this.explorerState,
                favoriteFolder: folder,
            })
        })
    }
}

function headerView(state: Explorer.TreeGroup, item: Explorer.BrowserNode) {
    if (
        item instanceof Explorer.ItemNode ||
        item instanceof Explorer.FutureItemNode ||
        item instanceof Explorer.DeletedItemNode
    ) {
        return undefined
    }
    return {
        class: 'align-items-center fv-pointer w-100 d-flex',
        children: [
            {
                class: `${item.icon} mr-2`,
            },
            child$(
                item.status$.pipe(
                    filter((status) =>
                        status.map((s) => s.type).includes('renaming'),
                    ),
                ),
                () => {
                    return headerRenamed(item as any, state)
                },
                {
                    untilFirst: {
                        innerText: item.name,
                    },
                },
            ),
        ],
        onclick: () => {
            state.explorerState.openFolder(item as Explorer.RegularFolderNode)
        },
    }
}

function headerRenamed(
    node: Explorer.FolderNode<'regular'> | Explorer.AnyItemNode,
    state: Explorer.TreeGroup,
): VirtualDOM {
    return {
        tag: 'input',
        type: 'text',
        autofocus: true,
        style: {
            zIndex: 200,
        },
        class: 'mx-2',
        value: node.name,
        onclick: (ev) => ev.stopPropagation(),
        onkeydown: (ev) => {
            if (ev.key === 'Enter') {
                state.explorerState.rename(node, ev.target.value)
            }
        },
        connectedCallback: (elem: HTMLElement) => {
            elem.focus()
        },
    }
}
