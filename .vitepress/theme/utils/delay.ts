export function delay(func, wait = 200) {
    return function () {
        const args = arguments;
        const context = this;
        return setTimeout(() => {
            func.apply(context, args);
        }, wait);
    }
}

/**
 * usage：
 *
 * function greeting(name) {
 *   console.log(`Hello, ${name}!`);
 * }
 *
 * const delayedGreeting = delay(greeting, 3000);
 *
 * delayedGreeting('Tom'); // 3秒后输出Hello, Tom!
 */