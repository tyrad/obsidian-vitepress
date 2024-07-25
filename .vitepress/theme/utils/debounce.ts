export function debounce(func, wait = 200, immediate = false) {
    let timer = null;
    return function (...args) {
        if (immediate) {
            func.apply(this, args);
            immediate = false;
        } else {
            clearTimeout(timer);
            timer = setTimeout(() => {
                func.apply(this, args);
            }, wait);
        }
    };
}

/**
 * 使用方法如下：
 *
 * function doSomething() {
 *   console.log('doing something...');
 * }
 *
 * const debouncedFn = debounce(doSomething, 1000);
 * debouncedFn(); // 立即执行
 * debouncedFn(); // 在1000ms后执行
 */