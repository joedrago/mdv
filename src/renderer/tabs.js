const tabs = []
let activeTabId = null
let nextTabId = 1
let restoringSession = false

const tabBar = () => document.getElementById("tab-bar")
const contentArea = () => document.getElementById("content-area")

function createTab(filePath, title) {
    const id = nextTabId++
    const tab = { id, filePath, title, scrollTop: 0, content: "" }
    tabs.push(tab)

    // Create tab button
    const btn = document.createElement("div")
    btn.className = "tab-button"
    btn.dataset.tabId = id
    btn.title = filePath
    btn.innerHTML = `<span class="tab-title">${escapeHtml(title)}</span><span class="tab-close">&times;</span>`
    btn.querySelector(".tab-title").addEventListener("click", () => switchTab(id))
    btn.querySelector(".tab-close").addEventListener("click", (e) => {
        e.stopPropagation()
        closeTab(id)
    })
    tabBar().appendChild(btn)

    // Create content div
    const div = document.createElement("div")
    div.className = "tab-content"
    div.id = `tab-content-${id}`
    div.innerHTML = '<div class="markdown-body"></div>'
    contentArea().appendChild(div)

    switchTab(id)
    updateEmptyState()
    saveSession()
    return id
}

function switchTab(id) {
    // Save current scroll from the actual scroll container
    if (activeTabId !== null && !restoringSession) {
        const current = findTab(activeTabId)
        if (current) {
            current.scrollTop = contentArea().scrollTop
        }
    }

    activeTabId = id

    // Update tab button styles
    for (const btn of tabBar().querySelectorAll(".tab-button")) {
        btn.classList.toggle("active", parseInt(btn.dataset.tabId) === id)
    }

    // Show/hide content divs
    for (const div of contentArea().querySelectorAll(".tab-content")) {
        div.classList.toggle("hidden", div.id !== `tab-content-${id}`)
    }

    // Restore scroll on the actual scroll container
    const tab = findTab(id)
    if (tab) {
        contentArea().scrollTop = tab.scrollTop
    }

    // Update window title
    if (tab) {
        document.title = `${tab.title} - Markdown Viewer`
    }

    saveSession()
}

function closeTab(id) {
    const idx = tabs.findIndex((t) => t.id === id)
    if (idx === -1) return

    const tab = tabs[idx]

    // Unwatch the file
    if (tab.filePath) {
        window.mdv.unwatchFile(tab.filePath)
    }

    // Remove DOM elements
    const btn = tabBar().querySelector(`[data-tab-id="${id}"]`)
    if (btn) btn.remove()
    const div = document.getElementById(`tab-content-${id}`)
    if (div) div.remove()

    tabs.splice(idx, 1)

    // Switch to adjacent tab if closing active
    if (activeTabId === id) {
        if (tabs.length > 0) {
            const newIdx = Math.min(idx, tabs.length - 1)
            switchTab(tabs[newIdx].id)
        } else {
            activeTabId = null
            document.title = "Markdown Viewer"
            const sidebar = document.getElementById("toc-sidebar")
            if (sidebar) sidebar.innerHTML = ""
        }
    }

    updateEmptyState()
    saveSession()
}

function getActiveTab() {
    return findTab(activeTabId)
}

function findTab(id) {
    return tabs.find((t) => t.id === id) || null
}

function findTabByPath(filePath) {
    return tabs.find((t) => t.filePath === filePath) || null
}

function getMarkdownBody(tabId) {
    const div = document.getElementById(`tab-content-${tabId || activeTabId}`)
    return div ? div.querySelector(".markdown-body") : null
}

function getTabContentDiv(tabId) {
    return document.getElementById(`tab-content-${tabId}`)
}

function updateEmptyState() {
    const empty = document.getElementById("empty-state")
    if (empty) {
        empty.classList.toggle("hidden", tabs.length > 0)
    }
    tabBar().classList.toggle("hidden", tabs.length === 0)
}


function saveSession() {
    if (restoringSession) return
    try {
        // Snapshot active tab's scroll from the actual scroll container
        const active = findTab(activeTabId)
        if (active) {
            active.scrollTop = contentArea().scrollTop
        }
        const data = {
            tabs: tabs.map((t) => ({ filePath: t.filePath, scrollTop: t.scrollTop })),
            activeTab: active ? active.filePath : null
        }
        localStorage.setItem("mdv-session", JSON.stringify(data))
    } catch (_e) {
        // ignore
    }
}

function setRestoring(v) {
    restoringSession = v
}

function getSession() {
    try {
        return JSON.parse(localStorage.getItem("mdv-session"))
    } catch (_e) {
        return null
    }
}

function escapeHtml(str) {
    const div = document.createElement("div")
    div.textContent = str
    return div.innerHTML
}

// eslint-disable-next-line no-unused-vars
const Tabs = { createTab, switchTab, closeTab, getActiveTab, findTabByPath, getMarkdownBody, getTabContentDiv, saveSession, getSession, setRestoring }
