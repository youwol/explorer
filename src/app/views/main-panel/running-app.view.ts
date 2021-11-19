import { attr$, child$, HTMLElement$, VirtualDOM } from "@youwol/flux-view";
import { BehaviorSubject, Observable, ReplaySubject } from "rxjs";
import { AppState } from "../../app.state";
import { Nodes } from "../../data";


export class RunningApp {
    title: string
    icon: string
    headerView: VirtualDOM
    item: Nodes.ItemNode
    appURL$: Observable<string>
    public readonly iframe$ = new ReplaySubject<HTMLIFrameElement>()
}


export class HeaderRunningApp implements VirtualDOM {

    public readonly class = "w-100 d-flex p-2 fv-bg-background-alt justify-content-center align-items-center"
    public readonly children: VirtualDOM[]
    public readonly state: AppState
    style = {
        height: '50px'
    }
    constructor(params: { state: AppState }) {
        Object.assign(this, params)

        this.children = [
            child$(this.state.viewMode$, (d) => d == 'navigation'
                ? {}
                : this.content(d)
            )
        ]
    }

    content(runningApp: RunningApp) {
        let baseClass = 'fas my-auto fv-pointer fv-hover-text-secondary mx-2'
        let fullScreen$ = new BehaviorSubject<false | HTMLIFrameElement>(false)

        return {
            class: 'd-flex h-100',
            children: [
                runningApp.headerView,
                {
                    class: `${baseClass} fa-external-link-alt`,
                    onclick: () => this.state.close(runningApp)
                },
                {
                    class: `${baseClass} fa-expand`,
                    onclick: () => runningApp.iframe$.subscribe((elem) => {
                        fullScreen$.next(elem)
                    }),
                },
                {
                    class: `${baseClass} fa-times`,
                    onclick: () => this.state.close(runningApp)
                },
                {
                    class: `${baseClass} fa-window-minimize`,
                    onclick: () => {
                        this.state.persistApplication(runningApp)
                        this.state.toggleNavigationMode()
                    }
                }
            ],
            connectedCallback: (elem: HTMLElement$) => {
                elem.ownSubscriptions(
                    fullScreen$.subscribe((maybeIFrame: false | HTMLIFrameElement) => {
                        if (!maybeIFrame) {
                            document.exitFullscreen().catch((e) => { })
                            return
                        }
                        maybeIFrame.requestFullscreen()
                    })
                )
            }
        }
    }
}


export class ContentRunningApp implements VirtualDOM {

    public readonly class = 'h-100 w-100 d-flex'
    public readonly style = {
        border: 'thick double'
    }
    public readonly children: VirtualDOM[]
    public readonly runningApp: RunningApp

    constructor(params: {
        runningApp: RunningApp
    }) {
        Object.assign(this, params)
        this.children = [
            {
                tag: 'iframe',
                width: '100%',
                height: '100%',
                src: attr$(
                    this.runningApp.appURL$,
                    (url) => url
                ),
                connectedCallback: (elem: HTMLElement$ & HTMLIFrameElement) => {
                    this.runningApp.iframe$.next(elem)
                }
            }
        ]
    }
}
