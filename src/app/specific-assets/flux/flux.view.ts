import { attr$, VirtualDOM } from "@youwol/flux-view";
import { Select } from "@youwol/fv-input";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
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

export type Mode = 'runner' | 'builder'
export let RenderModeUrls: Record<Mode, any> = {
    'runner': (projectId) => `/ui/flux-runner/?id=${projectId}`,
    'builder': (projectId) => `/ui/flux-builder/?id=${projectId}`
}


export class FluxApp extends RunningApp {

    public readonly icon = "fas fa-play"
    public readonly title: string
    public readonly headerView: HeaderPreview

    public readonly item: Nodes.FluxProjectNode

    public readonly select = new Select.State([
        { name: 'Runner', id: "runner" },
        { name: 'Builder', id: "builder" }],
        'runner')

    public readonly appURL$: Observable<string>
    constructor(params: {
        item: Nodes.FluxProjectNode
    }) {
        super()
        Object.assign(this, params)
        this.title = this.item.name
        this.appURL$ = this.select.selectionId$.pipe(
            map((mode) => RenderModeUrls[mode](this.item.rawId))
        )
        this.headerView = new HeaderPreview({ item: this.item, select: this.select })
    }
}

