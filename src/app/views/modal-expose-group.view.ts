import { Nodes } from "../data"
import { BrowserState } from './panel-browser.state'
import { attr$ } from "@youwol/flux-view"
import { ExpandableGroup } from "@youwol/fv-group"

export function simpleGroupHeader(state: ExpandableGroup.State, expandable: boolean) {

    return {
        class: 'fv-bg-background px-2 rounded',
        children: [
            {
                class: 'd-flex align-items-center fv-pointer',
                children: {
                    expandIcon: expandable 
                        ? { 
                            tag: 'i', 
                            class: attr$(
                                state.expanded$,
                                d => d ? "fas fa-caret-down" : "fas fa-caret-right" 
                            )
                        }
                        : {},
                    title: { tag: 'span', class: 'px-2 fv-text-focus', innerText: state.name },
                }
            }
        ]
    }
}

export function modalExposeGroup(state: BrowserState , node: Nodes.FolderNode ){
    /*
    let request = new Request(`/api/assets-browser-backend/groups`)
    
    let modalState = new Modal.State()

    let selectedGroup$ = new BehaviorSubject<any>(undefined)
    let groupSelectState = new Select.State(
        FluxLibCore.createObservableFromFetch(request)
        .pipe( 
            map( (resp: any) =>{
            return resp.groups
            .filter(g => g.id != "private" && g.id != node.groupId )
            .map( g => new Select.ItemData(g.id, g.path ))
            }),
        tap( grps => selectedGroup$.next(grps[0].id))), 
        selectedGroup$,
    )

    let groupSelectView = new Select.View( {state: groupSelectState} )

    modalState.ok$.pipe( 
        withLatestFrom(groupSelectState.selection$))
    .subscribe( ([_, selection] ) => {
        let group = selection
        state.exposeGroup( node,  {groupId: group.id, path:group.name})
    })

    let okBttnView = new Button.View({
        state: new Button.State(modalState.ok$), 
        contentView: () => ({innerText: 'Expose'})
    })

    let cancelBttnView = new Button.View({
        state: new Button.State(modalState.cancel$), 
        contentView: () => ({innerText: 'Cancel'})
    })
    
    let contentView = () => {
        
        return {
            class:'fv-bg-background fv-text-primary p-3', style:{border:'solid'},
            children:[
                {
                    class: 'py-2',
                    innerText:`Select a group you want to advertise in the folder '${node.name}':`
                },
                groupSelectView,
                okBttnView,
                cancelBttnView
            ]   
        }
    }
    let view = new Modal.View( { 
        state: modalState,
        contentView 
    })
    let div = render(view)
    modalState.ok$.subscribe( () =>  div.remove())
    modalState.cancel$.subscribe( () => div.remove())

    return div*/
    return undefined
}