import { VirtualDOM } from '@youwol/flux-view'
import { BehaviorSubject } from 'rxjs'
import { PlatformBannerView, PlatformState, SideBarView, MainPanelView } from '@youwol/platform-essentials'


export class AppView implements VirtualDOM {

    class = 'h-100 w-100 d-flex flex-column fv-text-primary'
    state = new PlatformState()
    children: VirtualDOM[]

    constructor() {

        this.children = [
            new PlatformBannerView({ state: this.state }),
            {
                class: 'flex-grow-1 w-100 d-flex',
                style: { minHeight: '0px' },
                children: [
                    new SideBarView(this.state, new BehaviorSubject(false)),
                    new MainPanelView({ state: this.state })
                ]
            }
        ]
    }
}


