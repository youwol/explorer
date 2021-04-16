import {render} from '@youwol/flux-view'

export function createYouwolBanner(){

    return render(
        {
            tag: 'div', class:"d-flex w-100 fv-text-primary justify-content-between align-self-center  px-3 py-2 pr-5 border-bottom",
            children:[
                {
                    tag:'img',
                    src:'/api/assets-gateway/raw/package/QHlvdXdvbC9mbHV4LXlvdXdvbC1lc3NlbnRpYWxz/latest/assets/images/logo_YouWol_Platform_white.png',
                    style:{width:'250px'},
                }
            ]
        }
    ) 
}