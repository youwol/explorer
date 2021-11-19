import { children$, VirtualDOM } from '@youwol/flux-view'
import { Button } from '@youwol/fv-button'
import { of } from 'rxjs'
import { mergeMap } from 'rxjs/operators'
import { AppState } from '../../app.state'
import { Action, GENERIC_ACTIONS, getActions$ } from '../../actions.factory'


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

        let actionsParentFolder$ = this.state.currentFolder$.pipe(
            mergeMap((folder) => getActions$(this.state, { node: folder, selection: 'indirect' }, Object.values(GENERIC_ACTIONS)))
        )
        let actionSelectedItem$ = this.state.selectedItem$.pipe(
            mergeMap((item) => item
                ? getActions$(this.state, { node: item, selection: 'direct' }, Object.values(GENERIC_ACTIONS))
                : of([]))
        )
        let actionSpecificItem$ = this.state.selectedItem$.pipe(
            mergeMap((item) => item
                ? getActions$(this.state, { node: item, selection: 'direct' }, this.state.specificActions)
                : of([]))
        )

        this.children = [
            this.actionsList(actionSpecificItem$),
            this.actionsList(actionSelectedItem$),
            this.actionsList(actionsParentFolder$, false)
        ]
    }
    actionsList(actions$, withSeparator = true) {
        let sep: any = withSeparator ? [{ tag: 'br' }] : []
        return {
            class: 'd-flex flex-column',
            children: children$(
                actions$,
                (actions: Action[]) => actions.length > 0
                    ? actions.map((action) => this.actionView(action)).concat(sep)
                    : [{}]
            )
        }
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
