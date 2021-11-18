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

class ContentPreview implements VirtualDOM {

    public readonly class = 'h-100 w-100 d-flex'
    public readonly item: Nodes.FluxProjectNode
    public readonly select: Select.State

    public readonly children: VirtualDOM[]
    constructor(params: {
        item: Nodes.FluxProjectNode,
        select: Select.State
    }) {
        Object.assign(this, params)
        this.children = [
            {
                tag: 'iframe',
                width: '100%',
                height: '100%',
                src: attr$(
                    this.select.selection$,
                    (s) => s.id == 'default' ? "" : s.getUrl({ assetId: this.item.assetId, name: this.item.name })
                )
            }
        ]
    }
}

export class DataApp implements RunningApp {

    public readonly icon = "fas fa-play"
    public readonly title: string
    public readonly headerView: HeaderPreview
    public readonly contentView: ContentPreview

    public readonly item: Nodes.DataNode

    public readonly select: Select.State
    public readonly previews$: Observable<{ name: string, applicationURL: (n: any) => string }[]>
    constructor(params: {
        item: Nodes.FluxProjectNode
    }) {
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

        /*let previews = defaultApplications
            .filter((preview) => preview.canOpen(asset))
            .map((preview) => new TabPreview(preview))
 
        if (previews.length == 0 || !asset.permissions.read)
            return mainView
 
        let overViewUid = uuidv4()
        let state = new Tabs.State([new Tabs.TabData(overViewUid, "Overview"), ...previews])
        let view = new Tabs.View({
            state,
            contentView: (_, tabData: TabPreview) => tabData.id == overViewUid
                ? mainView
                : {
                    tag: 'iframe',
                    width: '100%',
                    style: { aspectRatio: '2' },
                    src: tabData.preview.applicationURL(asset)
                },
            headerView: (_, tabData) => ({
                class: `px-2 rounded border ${(tabData.id == overViewUid) ? 'overview' : 'default-app'}`,
                innerText: tabData.name
            })
        })
        */
        this.title = this.item.name
        this.headerView = new HeaderPreview({ item: this.item, select: this.select })
        this.contentView = new ContentPreview({ item: this.item, select: this.select })
    }
}

