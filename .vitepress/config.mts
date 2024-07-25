import {defineConfig} from 'vitepress'
import {markDownSetting} from "./theme/extension/markdown/markdown-setting";
import {autoNavLink} from "./theme/autoLink/nav";
import {autoSideLink} from "./theme/autoLink/side";

export const customConfiguration = {
	docsFolder: 'knowledge'
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
	srcDir: `${process.cwd()}/${customConfiguration.docsFolder}`,
	outDir: `${process.cwd()}/dist`,
	title: "Mistj's Digital Garden",
	description: "Mistj's Digital Garden",
	themeConfig: {
		// https://vitepress.dev/reference/default-theme-config
		nav: [
			...autoNavLink(customConfiguration.docsFolder, false, ['归档', '知识卡片', '读书', '其他']),
			{text: 'legacy', link: 'http://legacy.mistj.com'},
		],
		sidebar: {
			...autoSideLink(customConfiguration.docsFolder)
		},
		socialLinks: [
			{icon: 'github', link: 'https://github.com/tyrad/vitepress-blog'}
		],
		footer: {
			message: `<a href="https://www.upyun.com/?utm_source=lianmeng&utm_medium=referral" target="_blank">本站由<img width="55" height="24" src="https://img.mistj.com/b/upyun.png" class="inline">提供CDN加速/云存储服务</a>`,
			copyright: `©2023-2024 mistj  丨 <a href="https://beian.miit.gov.cn/" target="_blank">鲁ICP备2024086268号</a>`
		},
		/// 需要注意
		search: process.env.NODE_ENV === 'production' ? {
			provider: 'algolia',
			options: {
				appId: 'KJXRJ26Y9V',
				apiKey: '342cb5fec8f444ce08fcb9a8f82f7562',
				indexName: 'mistj',
			},
		} : {provider: 'local'}
	},
	vite: {
		server: {
			host: '0.0.0.0',
			open: true
		},
		plugins: [],
		resolve: {
			alias: {
				// workspace目录
				'@': process.cwd()
			}
		}
	},
	head: [
		// ['script', { type: 'module', src: 'https://cdn.jsdelivr.net/npm/markdown-it@13.0.1/dist/markdown-it.min.js' }]
		// https://tongji.baidu.com/
		[
			'script',
			{},
			`var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?528884ce27bc297714f7c2b5a6e8542c";
  var s = document.getElementsByTagName("script")[0]; 
  s.parentNode.insertBefore(hm, s);
})();`
		],
	],
	markdown: {
		toc: {
			level: [1, 2, 3, 4, 5]
		},
		config: markDownSetting(customConfiguration.docsFolder)
	},
	cleanUrls: true,
	sitemap: {
		hostname: 'https://mistj.com'
	}
})
