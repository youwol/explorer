import { DockableTabs } from '@youwol/fv-tabs'
import { child$, VirtualDOM } from '@youwol/flux-view'
import { Explorer } from '@youwol/platform-essentials'
import { combineLatest, from } from 'rxjs'
import { mergeMap, shareReplay } from 'rxjs/operators'
import { install } from '@youwol/cdn-client'

const bottomNavClasses = 'fv-bg-background fv-x-lighter w-100 overflow-auto'
const bottomNavStyle = {
    height: '50vh',
}

const defaultSrc = `
import {ExplorerSettings} from './explorer-settings'

async function getSettings() : Promise<ExplorerSettings>{
    return { 
        contextMenuActions:[]
    }
}
return getSettings
`

export class BottomNavTab extends DockableTabs.Tab {
    protected constructor(params: {
        id: string
        state: Explorer.ExplorerState
        content: () => VirtualDOM
        title: string
        icon: string
    }) {
        super({ ...params, id: params.id })
    }
}

export class SettingsTab extends BottomNavTab {
    constructor(params: { state: Explorer.ExplorerState }) {
        super({
            id: 'Settings',
            title: 'Settings',
            icon: 'fas fa-cogs',
            state: params.state,
            content: () => {
                return new SettingsView(params)
            },
        })
        Object.assign(this, params)
    }
}

export const fetchTypescriptCodeMirror$ = () =>
    from(
        install({
            modules: ['codemirror', 'typescript'],
            scripts: [
                'codemirror#5.52.0~mode/javascript.min.js',
                'codemirror#5.52.0~addons/lint/lint.js',
            ],
            css: [
                'codemirror#5.52.0~codemirror.min.css',
                'codemirror#5.52.0~theme/blackboard.min.css',
                'codemirror#5.52.0~addons/lint/lint.css',
            ],
        }),
    ).pipe(shareReplay({ bufferSize: 1, refCount: true }))

export class SettingsView implements VirtualDOM {
    public readonly class = bottomNavClasses
    public readonly style = bottomNavStyle
    public readonly children: VirtualDOM[]
    constructor(params: { state: Explorer.ExplorerState }) {
        this.children = [
            child$(
                combineLatest([
                    Explorer.RequestsExecutor.getExplorerSettings(),
                    fetchTypescriptCodeMirror$().pipe(
                        mergeMap(() => from(import('./ts-code-editor.view'))),
                    ),
                ]),
                ([settings, mdle]) => {
                    return new mdle.TsCodeEditorView({
                        src: settings['tsSrc'] || defaultSrc,
                        explorerState: params.state,
                    })
                },
            ),
        ]
    }
}
