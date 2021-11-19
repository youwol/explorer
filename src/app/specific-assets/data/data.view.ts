import { attr$, VirtualDOM } from "@youwol/flux-view";
import { getSettings$ } from "@youwol/flux-youwol-essentials";
import { Select } from "@youwol/fv-input";
import { BehaviorSubject, Observable } from "rxjs";
import { map, tap } from "rxjs/operators";
import { Nodes } from "../../data";
import { RunningApp } from "../../views/main-panel/running-app.view";



class HeaderPreview implements VirtualDOM {

    public readonly class = 'd-flex align-items-center w-100 my-auto'
    public readonly children: VirtualDOM[]
    public readonly item: Nodes.FluxProjectNode
    public readonly select: Select.State

    constructor(params: {
        item: Nodes.FluxProjectNode,
        select: Select.State
    }) {
        Object.assign(this, params)

        this.children = [
            {
                class: 'd-flex align-items-center rounded fv-bg-background px-2 fv-text-focus border fv-border-focus',
                children: [
                    {
                        innerText: this.item.name
                    }]
            },
            new Select.View({ state: this.select, class: 'mx-2' } as any)
        ]
    }

}


export class DataApp extends RunningApp {

    public readonly icon = "fas fa-database"
    public readonly title: string
    public readonly headerView: HeaderPreview

    public readonly item: Nodes.DataNode

    public readonly select: Select.State
    public readonly previews$: Observable<{ name: string, applicationURL: (n: any) => string }[]>

    public readonly appURL$: Observable<string>

    constructor(params: {
        item: Nodes.FluxProjectNode
    }) {
        super()
        Object.assign(this, params)
        let selected$ = new BehaviorSubject("default")
        this.previews$ = getSettings$().pipe(
            map((settings) => {
                console.log("Settings", settings, this.item)
                return settings.defaultApplications
                    .filter((preview) => preview.canOpen(this.item))
            }
            ),
            tap(previews => {
                if (previews.length > 0)
                    selected$.next(previews[0].name)
            })
        )
        this.select = new Select.State(
            this.previews$.pipe(
                map((previews) => [
                    { id: 'default', name: 'default' },
                    ...previews.map(p => ({ id: p.name, name: p.name, getUrl: p.applicationURL }))
                ])
            ),
            selected$
        )

        this.appURL$ = this.select.selection$.pipe(
            map((s: any) => s.id == 'default' ? "" : s.getUrl({ assetId: this.item.assetId, name: this.item.name }))
        )

        this.title = this.item.name
        this.headerView = new HeaderPreview({ item: this.item, select: this.select })
    }
}

