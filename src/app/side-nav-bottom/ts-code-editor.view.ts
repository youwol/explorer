import { CodeEditorView } from '../common/code-editor.view'
import * as ts from 'typescript'
import { BehaviorSubject } from 'rxjs'
import { createDefaultMapFromCDN } from './vfs_default_map_cdn'
import CodeMirror from 'codemirror'
import { filter, map, take, withLatestFrom } from 'rxjs/operators'
import { Explorer } from '@youwol/platform-essentials'
import { ModuleKind } from 'typescript'
import {
    createSystem,
    createVirtualTypeScriptEnvironment,
} from '@typescript/vfs'

export class TsCodeEditorView extends CodeEditorView {
    public readonly fsMap$ = new BehaviorSubject(undefined)
    public readonly explorerState: Explorer.ExplorerState

    constructor(params: {
        src: string
        explorerState: Explorer.ExplorerState
    }) {
        super({
            src$: new BehaviorSubject<string>(params.src),
            language: 'text/typescript',
            config: {
                lineNumbers: true,
                theme: 'blackboard',
                lineWrapping: false,
                gutters: ['CodeMirror-lint-markers'],
                indentUnit: 4,
                lint: {
                    options: {
                        editorKind: 'TsCodeEditorView',
                        esversion: 2021,
                    },
                },
                extraKeys: {
                    'Ctrl-Enter': () => {
                        this.nativeEditor$
                            .pipe(
                                take(1),
                                map((native) => {
                                    let transpiled = ts
                                        .transpileModule(native.getValue(), {
                                            compilerOptions,
                                        })
                                        .outputText.replace('export {};', '')
                                    return {
                                        tsSrc: native.getValue(),
                                        jsSrc: transpiled,
                                    }
                                }),
                            )
                            .subscribe((settings) => {
                                params.explorerState.setExplorerSettingsSrc(
                                    settings,
                                )
                            })
                    },
                },
            },
        })

        createDefaultMapFromCDN(
            { target: ts.ScriptTarget.ES2020 },
            '4.6.2',
        ).then((fsMap) => {
            this.fsMap$.next(fsMap)
        })
        this.fsMap$
            .pipe(
                filter((d) => d),
                withLatestFrom(this.nativeEditor$),
                take(1),
            )
            .subscribe(([_, native]) => {
                native.setValue(native.getValue())
            })

        CodeMirror.registerHelper('lint', 'javascript', (text, options) => {
            if (options.editorKind != 'TsCodeEditorView') {
                return []
            }
            let fsMapBase = this.fsMap$.getValue()
            if (!fsMapBase) return
            const highlights = getHighlights(fsMapBase, text)
            return (
                highlights
                    // allow 'return' outside a function body
                    .filter((highlight) => highlight.diagnostic.code != 1108)
                    .map((highlight) => ({
                        ...highlight,
                        message: highlight.messageText,
                    }))
            )
        })
    }
}

export interface SrcPosition {
    line: number
    ch: number
}

export class SrcHighlight {
    public readonly messageText: string
    public readonly from: SrcPosition
    public readonly to: SrcPosition

    constructor(public readonly diagnostic: ts.Diagnostic) {
        this.messageText = diagnostic.messageText as string
        if (this.messageText['messageText']) {
            this.messageText = this.messageText['messageText']
        }
        const from_location = diagnostic.file.getLineAndCharacterOfPosition(
            diagnostic.start,
        )
        this.from = {
            line: from_location.line,
            ch: from_location.character,
        }
        const to_location = diagnostic.file.getLineAndCharacterOfPosition(
            diagnostic.start + diagnostic.length,
        )
        console.log(diagnostic)
        this.to = { line: to_location.line, ch: to_location.character }
    }
}

export const compilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ModuleKind.ES2020,
    esModuleInterop: true,
    noImplicitAny: false,
}

export function getHighlights(fsMap, src) {
    fsMap.set('index.ts', `${src}`)
    const system = createSystem(fsMap)
    const env = createVirtualTypeScriptEnvironment(
        system,
        ['index.ts'],
        ts,
        compilerOptions,
    )
    return [
        ...env.languageService.getSyntacticDiagnostics('index.ts'),
        ...env.languageService.getSemanticDiagnostics('index.ts'),
    ].map((d) => new SrcHighlight(d))
}
