import { child$, VirtualDOM } from "@youwol/flux-view";
import { BehaviorSubject } from "rxjs";
import { Core, Explorer, TopBanner } from "@youwol/platform-essentials";

import { mergeMap } from "rxjs/operators";

/**
 * Top banner of the application
 */
export class TopBannerView extends TopBanner.YouwolBannerView {
  constructor(params: { state: AppState }) {
    super({
      state: params.state.topBannerState,
      customActionsView: new Explorer.HeaderPathView({
        state: params.state,
        class: "mx-auto w-100 d-flex align-items-center",
      } as any),
      userMenuView: TopBanner.defaultUserMenu(params.state.topBannerState),
      youwolMenuView: TopBanner.defaultYouWolMenu(params.state.topBannerState),
    });
  }
}

export class AppState extends Explorer.ExplorerState {
  public readonly displayMode$ = new BehaviorSubject<Explorer.DisplayMode>(
    "details"
  );
  public readonly topBannerState = new TopBanner.YouwolBannerState();

  constructor() {
    super();
    Core.ChildApplicationAPI.setProperties({
      snippet: {
        class: "d-flex align-items-center px-1",
        children: [
          {
            class: "fas fa-user mr-1",
          },
          child$(
            this.currentFolder$.pipe(mergeMap(({ tree }) => tree.root$)),
            (root) => ({ innerText: root.name })
          ),
          {
            class: "fas fa-folder mx-1",
          },
          child$(this.currentFolder$, ({ folder }) => ({
            innerText: folder.name,
          })),
        ],
      },
    });
  }
}

export class AppView implements VirtualDOM {
  class = "h-100 w-100 d-flex flex-column fv-text-primary";
  state = new AppState();
  children: VirtualDOM[];

  constructor() {
    this.children = [
      new TopBannerView({ state: this.state }),
      new Explorer.MainPanelView({ state: this.state }),
    ];
  }
}
