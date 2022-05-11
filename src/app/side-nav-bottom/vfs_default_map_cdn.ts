import * as ts from 'typescript'
import { ScriptTarget } from 'typescript'
import { fetchSource, getUrlBase } from '@youwol/cdn-client'

export function createDefaultMapFromCDN(
    options: ts.CompilerOptions,
    version: string,
) {
    const base = [
        'lib.d.ts',
        'lib.dom.d.ts',
        'lib.dom.iterable.d.ts',
        'lib.webworker.d.ts',
        'lib.webworker.importscripts.d.ts',
        'lib.scripthost.d.ts',
        'lib.es5.d.ts',
        'lib.es6.d.ts',
    ]
    let es = [
        `lib.es2015.d.ts`,
        'lib.es2015.collection.d.ts',
        'lib.es2015.core.d.ts',
        'lib.es2015.generator.d.ts',
        'lib.es2015.iterable.d.ts',
        'lib.es2015.promise.d.ts',
        'lib.es2015.proxy.d.ts',
        'lib.es2015.reflect.d.ts',
        'lib.es2015.symbol.d.ts',
        'lib.es2015.symbol.wellknown.d.ts',
    ]
    if (options.target >= ScriptTarget.ES2016) {
        es = [
            ...es,
            `lib.es2016.d.ts`,
            'lib.es2016.full.d.ts',
            'lib.es2016.array.include.d.ts',
        ]
    }
    if (options.target >= ScriptTarget.ES2017) {
        es = [
            ...es,
            `lib.es2017.d.ts`,
            'lib.es2017.full.d.ts',
            'lib.es2017.object.d.ts',
            'lib.es2017.sharedmemory.d.ts',
            'lib.es2017.string.d.ts',
            'lib.es2017.intl.d.ts',
            'lib.es2017.typedarrays.d.ts',
        ]
    }
    if (options.target >= ScriptTarget.ES2018) {
        es = [
            ...es,
            `lib.es2018.d.ts`,
            'lib.es2018.full.d.ts',
            'lib.es2018.intl.d.ts',
            'lib.es2018.asyncgenerator.d.ts',
            'lib.es2018.asynciterable.d.ts',
            'lib.es2018.promise.d.ts',
            'lib.es2018.regexp.d.ts',
        ]
    }
    if (options.target >= ScriptTarget.ES2019) {
        es = [
            ...es,
            `lib.es2019.d.ts`,
            'lib.es2019.full.d.ts',
            'lib.es2019.array.d.ts',
            'lib.es2019.object.d.ts',
            'lib.es2019.string.d.ts',
            'lib.es2019.symbol.d.ts',
        ]
    }
    if (options.target >= ScriptTarget.ES2020) {
        es = [
            ...es,
            `lib.es2020.d.ts`,
            'lib.es2020.full.d.ts',
            'lib.es2020.intl.d.ts',
            'lib.es2020.bigint.d.ts',
            'lib.es2020.promise.d.ts',
            'lib.es2020.sharedmemory.d.ts',
            'lib.es2020.string.d.ts',
            'lib.es2020.symbol.wellknown.d.ts',
        ]
    }
    const fsMap = new Map<string, string>()

    const promises = [...base, ...es]
        .map((filename) => [
            filename,
            `${getUrlBase('typescript', version)}/lib/${filename}`,
        ])
        .map(([filename, url]) =>
            fetchSource({ name: filename, url }).then(({ content }) => {
                fsMap.set(`/${filename}`, content)
            }),
        )
    const interfaces = fetchSource({
        name: 'explorer-settings.d.ts',
        url: `${getUrlBase(
            '@youwol/platform-essentials',
            'latest',
        )}/dist/lib/explorer/explorer-settings.d.ts`,
    }).then(({ content }) => {
        fsMap.set(`/explorer-settings.ts`, content)
    })

    return Promise.all([...promises, interfaces]).then(() => {
        console.log({ fsMap })
        return fsMap
    })
}
