import { attr$, VirtualDOM } from "@youwol/flux-view";
import { getSettings$ } from "@youwol/flux-youwol-essentials";
import { Select } from "@youwol/fv-input";
import { BehaviorSubject, Observable, of } from "rxjs";
import { map, tap } from "rxjs/operators";
import { Nodes } from "../../data";
import { RunningApp } from "../main-panel/running-app.view";



class HeaderPreview implements VirtualDOM {

    public readonly class = 'd-flex align-items-center w-100 my-auto'
    public readonly children: VirtualDOM[]

    constructor(params: {
    }) {
        Object.assign(this, params)

        this.children = [
            {
                class: 'd-flex align-items-center rounded fv-bg-background px-2 fv-text-focus border fv-border-focus',
                children: [
                    {
                        innerText: "Market place"
                    }]
            }
        ]
    }

}


export class MarketplaceApp extends RunningApp {

    public readonly icon = "fas fa-shopping-cart"
    public readonly title = "Market place"
    public readonly headerView = new HeaderPreview({})
    public readonly appURL$ = of('/ui/exhibition-halls/?conf=ewoieW91d29sTWVudSI6ZmFsc2UsCiJ1c2VyTWVudSI6ZmFsc2UKfQ==')

    constructor(params: {}) {
        super()
        Object.assign(this, params)
    }
    item: Nodes.ItemNode = undefined;
}

