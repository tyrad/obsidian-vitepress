<script setup lang="js">
import {useRoute} from 'vitepress'
import {nextTick, onMounted, ref, watch} from "vue";

const route = useRoute()

onMounted(() => {
  watch(route,
      () => {
        nextTick(() => {
          let asides = document.getElementsByClassName('aside')
          if (asides && asides.length) {
            let innerText = asides[0].innerText
            asides[0].style.display = (innerText && innerText.trim() !== 'On this page Table of Contents for current page') ? '' : 'none'
          }
        });
      }, {immediate: true})
})
</script>

<template>

</template>