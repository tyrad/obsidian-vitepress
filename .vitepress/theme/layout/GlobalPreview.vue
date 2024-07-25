<script setup>

import {onMounted, onUnmounted, render} from "vue";
import {debounce} from "../utils/debounce";
import {delay} from "../utils/delay";

const delegationSelector = ".x-ob-link";
const popoverSelector = ".ob-md-popover";
// 实时获取的当前时间的timer
let currentTarget = null;
// 延迟删除的timer
let delayDeleteTimer = null

function vnodeToHtml(node) {
  const container = document.createElement("div");
  // 添加到容器
  render(node, container);
  // 返回容器中的html字符串
  return container.innerHTML;
}

/**
 * 获取当前元素。如果没有获取到元素，返回的是null
 * @param selector
 * @param element
 * @returns {HTMLElement}
 */
const getCurrentPopoverNode = (selector, element) => {
  let matchSuccess = false;
  let currentNode = element;
  while (currentNode && !matchSuccess) {
    matchSuccess = currentNode.matches(selector);
    if (!matchSuccess) {
      currentNode = currentNode.parentElement;
    }
  }
  return currentNode;
}

const makeDomPosition = (dom, offsetXForMouse, target) => {
  const rectPosition = target.getBoundingClientRect();
  const distanceFromBottom = window.innerHeight - rectPosition.bottom
  const distanceFromRight = window.innerWidth - rectPosition.right

  const popOverHeight = Math.min(window.innerHeight * 0.7, 400, dom.clientHeight)
  dom.style.height = `${popOverHeight}px`;
  // 距离屏幕顶端的高度
  dom.style.top = (-document.body.getBoundingClientRect().top + rectPosition.bottom) + 'px'
  dom.style.left = `${rectPosition.left + offsetXForMouse}px`;

  const magicSpaceDistance = 16;
  // 计算剩余多少高度，才能正常显示到底部
  const deltaY = distanceFromBottom < popOverHeight ? popOverHeight - distanceFromBottom : 0;
  if (deltaY) {
    dom.style.top = `${+(dom.style.top.replace(/px$/, '')) - deltaY - magicSpaceDistance}px`;
    dom.style.left = `${rectPosition.left + rectPosition.width}px`;
  }
  const popOverMaxWidth = Math.min(window.innerWidth * 0.8, 450)
  dom.style.width = `${popOverMaxWidth}px`;
  const deltaX = distanceFromRight < popOverMaxWidth ? popOverMaxWidth - distanceFromRight : 0;
  if (deltaX) {
    dom.style.left = `${rectPosition.left + rectPosition.width - deltaX - magicSpaceDistance}px`;
  }
}

/**
 * 渲染文本  1. lodash  2.remove other first 3.check event position still on ob link
 * @param html
 * @param event
 */
const renderHtmlDebounced = debounce((html, event) => {
  // 先删除其他窗
  removeOtherPopover(event.target);
  // check event position still on ob link
  if (!currentTarget.matches(delegationSelector)) {
    return;
  }
  // 再添加新弹窗
  const newElement = document.createElement('div');
  newElement.style.position = 'absolute';
  newElement.innerHTML = html
  newElement.style.padding = '16px';
  newElement.style.overflow = 'auto';
  let level = '0';
  const currentPopoverNode = getCurrentPopoverNode(popoverSelector, event.target);
  if (currentPopoverNode) {
    level = +currentPopoverNode.getAttribute('data-level');
    level += 1;
  }
  newElement.setAttribute('data-level', `${level}`);
  const cls = ['ob-md-popover', 'vp-doc', 'absolute', 'right-0', 'z-10', 'w-56',
    'origin-top-right', 'rounded-md', 'shadow-lg', 'ring-1', 'ring-black', 'ring-opacity-5',
    'focus:outline-none', 'bg-white', 'dark:border-gray-600', 'dark:bg-neutral-800', 'dark:text-gray-400']
  newElement.classList.add(...cls);
  document.body.appendChild(newElement)
  makeDomPosition(newElement, event.offsetX, event.target);
});

/**
 * 删除除了本弹窗外的本级和下级弹窗
 * @param target event target
 */
const removeOtherPopover = (target) => {
  const popoverElements = document.querySelectorAll(popoverSelector)
  if (popoverElements.length === 0) {
    return;
  }
  const currentPopoverNode = getCurrentPopoverNode(popoverSelector, target)
  let currentNodeLevel = 0;
  if (currentPopoverNode) {
    currentNodeLevel = +currentPopoverNode.getAttribute('data-level');
  }
  for (let i = popoverElements.length - 1; i >= 0; i--) {
    let popoverEle = popoverElements[i]
    const popoverEleLeve = +popoverEle.getAttribute('data-level');
    if (popoverEleLeve >= currentNodeLevel && currentPopoverNode !== popoverEle) {
      popoverEle.remove()
    }
  }
}

/**
 * 删除除了本弹窗外的本级和下级弹窗(延迟删除，增加容错率）
 */
const removeOtherPopoverWithDelay = delay(() => {
  if (!currentTarget.matches(delegationSelector)) {
    removeOtherPopover(currentTarget);
    delayDeleteTimer = null;
  }
})

class ImportError extends Error {
}

/**
 * 重新包装import (目的：捕获异常)
 * @param modulePath
 * @returns {Promise<*>}
 */
const loadModule = async (modulePath) => {
  try {
    return await import(/* @vite-ignore */modulePath)
  } catch (e) {
    throw new ImportError(`Unable to import module ${modulePath}`)
  }
}

// https://github.com/rollup/rollup/blob/fec513270c6ac350072425cc045db367656c623b/src/utils/sanitizeFileName.ts
const INVALID_CHAR_REGEX = /[\u0000-\u001F"#$&*+,:;<=>?[\]^`{|}\u007F]/g;
const DRIVE_LETTER_REGEX = /^[a-z]:/i;

function sanitizeFileName(name) {
  const match = DRIVE_LETTER_REGEX.exec(name);
  const driveLetter = match ? match[0] : '';
  return (driveLetter +
      name
          .slice(driveLetter.length)
          .replace(INVALID_CHAR_REGEX, '_')
          .replace(/(^|\/)_+(?=[^/]*$)/, '$1'));
}

async function onMouseOver(event) {
  let target = event.target,
      related = event.relatedTarget;
  currentTarget = target;
  // 当前不是链接
  if (!target.matches(delegationSelector)) {
    if (related && related.matches(delegationSelector)) {
      // 如果是从link移动到其他位置，需要进行延迟清除
      delayDeleteTimer = removeOtherPopoverWithDelay();
    } else {
      if (!delayDeleteTimer) {
        removeOtherPopover(target);
      }
    }
    return;
  }
  if (related === target) {
    return;
  }
  let path = decodeURIComponent(target.href)
      .replace(/^http(s)?:\/\/[^\/]+/, "")
      .replace(/#.*?$/, '')
      .replace(/.html$/, '.md');
  if (import.meta.env.DEV) {
    path += `?t=${Date.now()}`;
  } else {
    path = sanitizeFileName(path.replace(/^\//, '')
        .replace(/\//g, '_'))
    const pathHash = window.__VP_HASH_MAP__[path.toLowerCase()]
    if (!pathHash) {
      renderHtmlDebounced('页面未创建或未公开', event)
      return;
    }
    path = `/assets/${path}.${pathHash}.js`
  }
  try {
    const dynamicHtml = await loadModule(path)
    const html = vnodeToHtml(dynamicHtml.default.render())
    renderHtmlDebounced(html, event)
  } catch (e) {
    renderHtmlDebounced('页面加载失败', event)
  }
}

function isNotMobileDevice() {
  return !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

if (isNotMobileDevice()) {
  onMounted(() => {
    document.body.addEventListener("mouseover", onMouseOver);
  });
  onUnmounted(() => {
    document.body.removeEventListener("mouseover", onMouseOver);
  })
}
</script>