import { attr$, VirtualDOM } from "@youwol/flux-view";
import { Select } from "@youwol/fv-input";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Nodes } from "../../data";
import { RunningApp } from "../../views/main-panel/running-app.view";



class HeaderPreview implements VirtualDOM {

    public readonly class = 'd-flex align-items-center w-100 my-auto'
    public readonly children: VirtualDOM[]
    public readonly item: Nodes.StoryNode

    public readonly select: Select.State

    constructor(params: {
        item: Nodes.StoryNode,
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

export class StoryApp extends RunningApp {

    public readonly icon = "fas fa-book"
    public readonly title: string
    public readonly headerView: HeaderPreview

    public readonly item: Nodes.StoryNode

    public readonly select = new Select.State([
        { name: 'Reader', id: "reader" },
        { name: 'Writer', id: "writer" }],
        'reader')

    public readonly appURL$: Observable<string>

    constructor(params: {
        item: Nodes.FluxProjectNode
    }) {
        super()
        Object.assign(this, params)
        this.title = this.item.name

        this.appURL$ = this.select.selectionId$.pipe(
            map((mode) => mode == 'reader'
                ? `/ui/stories/?id=${this.item.rawId}&conf=eyJ0b3BCYW5uZXIiOmZhbHNlLCAiZWRpdG9yIjogZmFsc2V9`
                : `/ui/stories/?id=${this.item.rawId}`)
        )

        this.headerView = new HeaderPreview({ item: this.item, select: this.select })
    }
}

