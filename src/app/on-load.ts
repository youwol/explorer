import { render } from "@youwol/flux-view";

require('./style.css');

let state = require('./app.state')
let view = require('./app.view')
let banner = require('./views/top-menu-bar.view')

// this needs to be called first because it sets the user in full-local mode
//document.getElementById("header").appendChild(banner.createYouwolBanner())

let appState = new state.AppState()
let appView = new view.AppView(appState)

document.getElementById("content").appendChild(render(appView))
//appView.render(appView)
export { }
