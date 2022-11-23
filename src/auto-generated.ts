
const runTimeDependencies = {
    "externals": {
        "@youwol/os-core": "^0.1.1",
        "@youwol/os-asset": "^0.1.1",
        "@youwol/os-explorer": "^0.1.1",
        "@youwol/os-top-banner": "^0.1.1",
        "@youwol/cdn-client": "^1.0.2",
        "@youwol/flux-view": "^1.0.3",
        "rxjs": "^6.5.5",
        "marked": "^3.0.0"
    },
    "includedInBundle": {}
}
const externals = {
    "@youwol/os-core": "window['@youwol/os-core_APIv01']",
    "@youwol/os-asset": "window['@youwol/os-asset_APIv01']",
    "@youwol/os-explorer": "window['@youwol/os-explorer_APIv01']",
    "@youwol/os-top-banner": "window['@youwol/os-top-banner_APIv01']",
    "@youwol/cdn-client": "window['@youwol/cdn-client_APIv1']",
    "@youwol/flux-view": "window['@youwol/flux-view_APIv1']",
    "rxjs": "window['rxjs_APIv6']",
    "marked": "window['marked_APIv3']",
    "rxjs/operators": "window['rxjs_APIv6']['operators']"
}
const exportedSymbols = {
    "@youwol/os-core": {
        "apiKey": "01",
        "exportedSymbol": "@youwol/os-core"
    },
    "@youwol/os-asset": {
        "apiKey": "01",
        "exportedSymbol": "@youwol/os-asset"
    },
    "@youwol/os-explorer": {
        "apiKey": "01",
        "exportedSymbol": "@youwol/os-explorer"
    },
    "@youwol/os-top-banner": {
        "apiKey": "01",
        "exportedSymbol": "@youwol/os-top-banner"
    },
    "@youwol/cdn-client": {
        "apiKey": "1",
        "exportedSymbol": "@youwol/cdn-client"
    },
    "@youwol/flux-view": {
        "apiKey": "1",
        "exportedSymbol": "@youwol/flux-view"
    },
    "rxjs": {
        "apiKey": "6",
        "exportedSymbol": "rxjs"
    },
    "marked": {
        "apiKey": "3",
        "exportedSymbol": "marked"
    }
}

// eslint-disable-next-line @typescript-eslint/ban-types -- allow to allow no secondary entries
const mainEntry : Object = {
    "entryFile": "./index.ts",
    "loadDependencies": [
        "@youwol/os-core",
        "@youwol/os-asset",
        "@youwol/os-explorer",
        "@youwol/os-top-banner",
        "@youwol/cdn-client",
        "@youwol/flux-view",
        "rxjs",
        "marked"
    ]
}

// eslint-disable-next-line @typescript-eslint/ban-types -- allow to allow no secondary entries
const secondaryEntries : Object = {}
const entries = {
     '@youwol/explorer': './index.ts',
    ...Object.values(secondaryEntries).reduce( (acc,e) => ({...acc, [`@youwol/explorer/${e.name}`]:e.entryFile}), {})
}
export const setup = {
    name:'@youwol/explorer',
        assetId:'QHlvdXdvbC9leHBsb3Jlcg==',
    version:'0.2.3-wip',
    shortDescription:"The (files & assets) explorer of YouWol.",
    developerDocumentation:'https://platform.youwol.com/applications/@youwol/cdn-explorer/latest?package=@youwol/explorer',
    npmPackage:'https://www.npmjs.com/package/@youwol/explorer',
    sourceGithub:'https://github.com/youwol/explorer',
    userGuide:'https://l.youwol.com/doc/@youwol/explorer',
    apiVersion:'02',
    runTimeDependencies,
    externals,
    exportedSymbols,
    entries,
    getDependencySymbolExported: (module:string) => {
        return `${exportedSymbols[module].exportedSymbol}_APIv${exportedSymbols[module].apiKey}`
    },

    installMainModule: ({cdnClient, installParameters}:{cdnClient, installParameters?}) => {
        const parameters = installParameters || {}
        const scripts = parameters.scripts || []
        const modules = [
            ...(parameters.modules || []),
            ...mainEntry['loadDependencies'].map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@youwol/explorer_APIv02`]
        })
    },
    installAuxiliaryModule: ({name, cdnClient, installParameters}:{name: string, cdnClient, installParameters?}) => {
        const entry = secondaryEntries[name]
        const parameters = installParameters || {}
        const scripts = [
            ...(parameters.scripts || []),
            `@youwol/explorer#0.2.3-wip~dist/@youwol/explorer/${entry.name}.js`
        ]
        const modules = [
            ...(parameters.modules || []),
            ...entry.loadDependencies.map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        if(!entry){
            throw Error(`Can not find the secondary entry '${name}'. Referenced in template.py?`)
        }
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@youwol/explorer/${entry.name}_APIv02`]
        })
    }
}
