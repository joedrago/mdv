let wrapNavigation = false

try {
    wrapNavigation = localStorage.getItem("mdv-wrap-navigation") === "1"
} catch (_e) {
    // ignore
}

function toggleWrapNavigation() {
    wrapNavigation = !wrapNavigation
    try {
        localStorage.setItem("mdv-wrap-navigation", wrapNavigation ? "1" : "0")
    } catch (_e) {
        // ignore
    }
    return wrapNavigation
}

function getWrapNavigation() {
    return wrapNavigation
}

// eslint-disable-next-line no-unused-vars
const Settings = { toggleWrapNavigation, getWrapNavigation }
