const { contextBridge, ipcRenderer, webUtils } = require("electron")

contextBridge.exposeInMainWorld("mdv", {
    // Markdown rendering (runs in main process)
    renderMarkdown: (source) => ipcRenderer.invoke("render-markdown", source),

    // File operations
    openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
    readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
    watchFile: (filePath) => ipcRenderer.invoke("watch-file", filePath),
    unwatchFile: (filePath) => ipcRenderer.invoke("unwatch-file", filePath),
    openExternalLink: (url) => ipcRenderer.invoke("open-external-link", url),
    getRecentFiles: () => ipcRenderer.invoke("get-recent-files"),
    getAppPath: () => ipcRenderer.invoke("get-app-path"),
    getInitialFiles: () => ipcRenderer.invoke("get-initial-files"),
    print: () => ipcRenderer.invoke("print"),

    // Get native file path from a dropped File object
    getPathForFile: (file) => webUtils.getPathForFile(file),

    // Main -> Renderer listeners
    onFileChanged: (callback) => {
        ipcRenderer.on("file-changed", (_e, data) => callback(data))
    },
    onOpenFile: (callback) => {
        ipcRenderer.on("open-file", (_e, filePath) => callback(filePath))
    },
    onSetTheme: (callback) => {
        ipcRenderer.on("set-theme", (_e, theme) => callback(theme))
    },
    onToggleToc: (callback) => {
        ipcRenderer.on("toggle-toc", () => callback())
    },
    onCloseTab: (callback) => {
        ipcRenderer.on("close-tab", () => callback())
    },
    onMoveTab: (callback) => {
        ipcRenderer.on("move-tab", (_e, direction) => callback(direction))
    },
    onToggleFind: (callback) => {
        ipcRenderer.on("toggle-find", () => callback())
    },
    onBookmarkAction: (callback) => {
        ipcRenderer.on("bookmark-action", (_e, action) => callback(action))
    },
    onToggleWrapNavigation: (callback) => {
        ipcRenderer.on("toggle-wrap-navigation", () => callback())
    },
    sendWrapNavigationState: (value) => {
        ipcRenderer.send("wrap-navigation-state", value)
    }
})
