import { ContextMenu } from '@youwol/fv-context-menu'
import { AppState } from './app.view'
import { fromEvent, Observable } from 'rxjs'
import { shareReplay, tap } from 'rxjs/operators'
import {
    child$,
    VirtualDOM,
    HTMLElement$,
    children$,
    attr$,
} from '@youwol/flux-view'
import { Explorer } from '@youwol/platform-essentials'
import * as _ from 'lodash'

/**
 * Logic side of [[ContextMenuView]]
 */
export class ContextMenuState extends ContextMenu.State {
    public readonly appState: AppState
    public readonly div: HTMLDivElement
    public readonly item$: Observable<Explorer.BrowserNode>
    constructor(params: {
        appState: AppState
        item$: Observable<Explorer.BrowserNode>
        div: HTMLDivElement
    }) {
        super(
            fromEvent(params.div, 'contextmenu').pipe(
                tap(() => console.log('from event')),
                tap((ev: Event) => ev.preventDefault()),
            ) as Observable<MouseEvent>,
        )
        Object.assign(this, params)
    }

    dispatch(_ev: MouseEvent): VirtualDOM {
        console.log('DISPATCH')
        return {
            style: {
                zIndex: 1,
            },
            children: [
                child$(
                    this.item$ /*.pipe(map(({ folder }) => folder))*/,
                    (node: Explorer.BrowserNode) => {
                        return new ContextMenuView({
                            state: this,
                            selectedNode: node,
                        })
                    },
                ),
            ],
        }
    }
}

/**
 * Context-menu view
 */
export class ContextMenuView implements VirtualDOM {
    public readonly class =
        'fv-bg-background fv-x-lighter fv-text-primary py-1 container'
    public readonly style = {
        boxShadow: '0px 0px 3px white',
        fontFamily: 'serif',
        width: '300px',
    }
    public readonly id = 'context-menu-view'
    public readonly children //: Array<VirtualDOM>

    public readonly connectedCallback: (
        element: HTMLElement$ & HTMLDivElement,
    ) => void

    public readonly state: ContextMenuState
    public readonly selectedNode: Explorer.BrowserNode

    constructor(params: {
        state: ContextMenuState
        selectedNode: Explorer.BrowserNode
    }) {
        Object.assign(this, params)
        const actions$ = Explorer.getActions$(
            this.state.appState,
            this.selectedNode,
        ).pipe(shareReplay({ bufferSize: 1, refCount: true }))

        this.children = [
            {
                class: attr$(actions$, () => 'd-none', {
                    untilFirst: 'w-100 text-center fas fa-spinner fa-spin',
                }),
            },
            {
                class: 'w-100 h-100',
                children: children$(actions$, (actions) => {
                    return Object.entries(_.groupBy(actions, (d) => d.section))
                        .map(([section, groupActions]) => {
                            return [
                                new ContextSplitterView(),
                                new ContextSectionView({
                                    section,
                                    actions: groupActions as any,
                                }),
                            ]
                        })
                        .flat()
                        .slice(1)
                }),
            },
        ]
    }
}

export class ContextSplitterView implements VirtualDOM {
    public readonly class = 'fv-border-bottom-background-alt mx-auto my-1 w-100'
}

export class ContextSectionView implements VirtualDOM {
    public readonly children: VirtualDOM[]
    public readonly actions: Explorer.Action[]

    constructor(params: { section: string; actions: Explorer.Action[] }) {
        Object.assign(this, params)
        this.children = this.actions.map((action) => {
            return new ContextItemView({ action })
        })
    }
}

export class ContextItemView implements VirtualDOM {
    public readonly class

    public readonly children: VirtualDOM[]
    public readonly action: Explorer.Action
    public readonly onclick = () => {
        this.action.exe()
    }
    constructor(params: { action: Explorer.Action }) {
        Object.assign(this, params)
        const baseClass = `d-flex align-items-center row`
        this.class = this.action.authorized
            ? `${baseClass}  fv-hover-bg-secondary fv-hover-x-lighter  fv-pointer`
            : `${baseClass} fv-text-disabled`
        this.children = [
            {
                class: `${this.action.icon} col-2 text-center px-1`,
            },
            { class: `col-6`, innerText: this.action.name },
            { class: `col-4`, innerText: 'shortcut' },
        ]
    }
}
