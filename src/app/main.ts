export {}
require('./style.css');

let cdn = window['@youwol/cdn-client']
await cdn.fetchStyleSheets([
        "bootstrap#4.4.1~bootstrap.min.css",
        "fontawesome#5.12.1~css/all.min.css",
        "@youwol/fv-widgets#0.0.3~dist/assets/styles/style.youwol.css"
    ])

await cdn.fetchBundles(
      { d3:'5.15.0',
        lodash:'4.17.15',
        '@youwol/flux-view':'0.0.7',
        '@youwol/flux-core': '0.0.8',
        "@youwol/fv-group":"0.0.3",
        "@youwol/fv-input":"0.0.2",
        "@youwol/fv-button":"0.0.3",
        "@youwol/fv-tree":"0.0.3",
        "@youwol/fv-tabs":"0.0.2",
        rxjs: '6.5.5',
      }, 
      window
    )

await import('./on-load')
