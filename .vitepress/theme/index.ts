// https://vitepress.dev/guide/custom-theme
// @ts-ignore
import {h} from 'vue'
import Theme from 'vitepress/theme'
import './style.css'
import DefaultTitle from './layout/DefaultTitle.vue'

import GlobalPreview from './layout/GlobalPreview.vue';
import AutoAside from './layout/AutoAside.vue';

export default {
    ...Theme,
    Layout: () => {
        return h(Theme.Layout, null, {
            'doc-before': () => h(DefaultTitle),
            'layout-bottom': () => h(GlobalPreview),
            'aside-top': () => h(AutoAside)
        })
    },
    enhanceApp({app, router, siteData}) {
    }
}
