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

    // Drag-to-reorder
    btn.draggable = true
    btn.addEventListener("dragstart", (e) => {
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", id.toString())
        btn.classList.add("dragging")
    })
    btn.addEventListener("dragend", () => {
        btn.classList.remove("dragging")
        for (const b of tabBar().querySelectorAll(".tab-button")) {
            b.classList.remove("drag-over-left", "drag-over-right")
        }
    })
    btn.addEventListener("dragover", (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        const rect = btn.getBoundingClientRect()
        const midX = rect.left + rect.width / 2
        btn.classList.toggle("drag-over-left", e.clientX < midX)
        btn.classList.toggle("drag-over-right", e.clientX >= midX)
    })
    btn.addEventListener("dragleave", () => {
        btn.classList.remove("drag-over-left", "drag-over-right")
    })
    btn.addEventListener("drop", (e) => {
        e.preventDefault()
        e.stopPropagation()
        const draggedId = parseInt(e.dataTransfer.getData("text/plain"))
        if (isNaN(draggedId) || draggedId === id) return
        const rect = btn.getBoundingClientRect()
        const insertBefore = e.clientX < rect.left + rect.width / 2
        reorderTab(draggedId, id, insertBefore)
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

    // Regenerate TOC for the new active tab
    const body = getMarkdownBody(id)
    if (body) {
        TOC.generateTOC(body)
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

function reorderTab(draggedId, targetId, insertBefore) {
    const dragIdx = tabs.findIndex((t) => t.id === draggedId)
    const targetIdx = tabs.findIndex((t) => t.id === targetId)
    if (dragIdx === -1 || targetIdx === -1) return

    // Reorder array
    const [dragged] = tabs.splice(dragIdx, 1)
    const newTargetIdx = tabs.findIndex((t) => t.id === targetId)
    const insertIdx = insertBefore ? newTargetIdx : newTargetIdx + 1
    tabs.splice(insertIdx, 0, dragged)

    // Reorder DOM
    const bar = tabBar()
    const draggedBtn = bar.querySelector(`[data-tab-id="${draggedId}"]`)
    const targetBtn = bar.querySelector(`[data-tab-id="${targetId}"]`)
    if (insertBefore) {
        bar.insertBefore(draggedBtn, targetBtn)
    } else {
        bar.insertBefore(draggedBtn, targetBtn.nextSibling)
    }

    saveSession()
}

function moveTab(id, direction) {
    const idx = tabs.findIndex((t) => t.id === id)
    if (idx === -1) return
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= tabs.length) return

    // Swap in array
    ;[tabs[idx], tabs[newIdx]] = [tabs[newIdx], tabs[idx]]

    // Reorder DOM
    const bar = tabBar()
    const buttons = [...bar.querySelectorAll(".tab-button")]
    const btn = buttons[idx]
    const target = buttons[newIdx]
    if (direction < 0) {
        bar.insertBefore(btn, target)
    } else {
        bar.insertBefore(target, btn)
    }

    saveSession()
}

function escapeHtml(str) {
    const div = document.createElement("div")
    div.textContent = str
    return div.innerHTML
}

// eslint-disable-next-line no-unused-vars
const Tabs = { createTab, switchTab, closeTab, getActiveTab, findTabByPath, getMarkdownBody, getTabContentDiv, saveSession, getSession, setRestoring, moveTab }
