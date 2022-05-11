import { BehaviorSubject, ReplaySubject } from 'rxjs'
import { HTMLElement$, VirtualDOM } from '@youwol/flux-view'
import CodeMirror from 'codemirror'

export class CodeEditorView {
    public readonly config = {
        value: '',
        lineNumbers: true,
        theme: 'blackboard',
        lineWrapping: false,
        indentUnit: 4,
    }
    public readonly language: string
    public readonly class = 'w-100 h-100 d-flex flex-column overflow-auto'
    public readonly style = {
        'font-size': 'initial',
    }
    public readonly src$: BehaviorSubject<string>
    public readonly change$ = new ReplaySubject<CodeMirror.EditorChange[]>(1)
    public readonly cursor$ = new ReplaySubject<CodeMirror.Position>(1)
    public readonly children: VirtualDOM[]

    public readonly nativeEditor$ = new ReplaySubject<CodeMirror.Editor>(1)

    constructor(params: {
        src$: BehaviorSubject<string>
        language: string
        config?: unknown
    }) {
        Object.assign(this, params)
        const config = {
            ...this.config,
            mode: this.language,
            value: this.src$.getValue(),
        }
        this.children = [
            {
                id: 'code-mirror-editor',
                class: 'w-100 h-100',
                connectedCallback: (elem: HTMLElement$ & HTMLDivElement) => {
                    console.log('CodeMirror config', config)
                    const editor = CodeMirror(elem, config)
                    this.nativeEditor$.next(editor)
                    editor.on('changes', (_, changeObj) => {
                        this.change$.next(changeObj)
                        if (
                            changeObj.length == 1 &&
                            changeObj[0].origin == 'setValue'
                        ) {
                            return
                        }
                        this.src$.next(editor.getValue())
                    })
                    elem.querySelector('.CodeMirror').classList.add('h-100')
                    editor.on('cursorActivity', () => {
                        this.cursor$.next(editor.getCursor())
                    })
                },
            },
        ]
    }
}
