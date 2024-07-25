<script setup lang="ts">
import {useData, useRoute} from 'vitepress'
import {computed} from "vue";

const {page} = useData()
const route = useRoute()

const autoDecodeUrl = (path: string) => {
	if (!path) {
		return path;
	}
	let origin = path;
	while (origin != decodeURIComponent(origin)) {
		origin = decodeURIComponent(origin);
	}
	return origin;
}

const pageName = computed(() =>
	autoDecodeUrl(route.path.replace(/^.*[\\/]/, "")
		.replace(/\.html$/, ''))
)

</script>

<template>
	<div class="vp-doc" v-if="!page.title">
		<h1>
			{{ pageName }}
			<a class="header-anchor" :href="`#${pageName}`"
			   :aria-label="`Permalink to ${pageName};`"></a>
		</h1>
	</div>
</template>
