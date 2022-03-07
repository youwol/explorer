import { render } from '@youwol/flux-view'
import { AppView } from './app.view'

require('./style.css')

document.getElementById('content').appendChild(render(new AppView()))
