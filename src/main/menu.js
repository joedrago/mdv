const { Menu, app } = require("electron")
const { sendOpenFile, sendToggleToc, sendSetTheme, sendMoveTab, sendToggleFind, sendBookmarkAction } = require("./ipc-handlers")
const fileManager = require("./file-manager")

const themes = [
    { label: "GitHub Light", id: "github-light" },
    { label: "GitHub Dark", id: "github-dark" },
    { label: "GitHub Dimmed", id: "github-dimmed" },
    { label: "Solarized Light", id: "solarized-light" },
    { label: "Solarized Dark", id: "solarized-dark" },
    { label: "Dracula", id: "dracula" },
    { label: "Nord", id: "nord" },
    { label: "Gruvbox", id: "gruvbox" }
]

function buildMenu(win) {
    const isMac = process.platform === "darwin"

    const recentFiles = fileManager.getRecentFiles()
    const recentSubmenu =
        recentFiles.length > 0
            ? [
                  ...recentFiles.map((f) => ({
                      label: f,
                      click: () => sendOpenFile(win, f)
                  })),
                  { type: "separator" },
                  {
                      label: "Clear Recent Files",
                      click: () => {
                          fileManager.clearRecentFiles()
                          buildMenu(win)
                      }
                  }
              ]
            : [{ label: "No Recent Files", enabled: false }]

    const themeSubmenu = themes.map((t) => ({
        label: t.label,
        click: () => sendSetTheme(win, t.id)
    }))

    const template = [
        ...(isMac
            ? [
                  {
                      label: app.name,
                      submenu: [
                          { role: "about" },
                          { type: "separator" },
                          { role: "hide" },
                          { role: "hideOthers" },
                          { role: "unhide" },
                          { type: "separator" },
                          { role: "quit" }
                      ]
                  }
              ]
            : []),
        {
            label: "File",
            submenu: [
                {
                    label: "Open File...",
                    accelerator: "CmdOrCtrl+O",
                    click: async () => {
                        const { dialog } = require("electron")
                        const result = await dialog.showOpenDialog(win, {
                            properties: ["openFile"],
                            filters: [
                                { name: "Markdown Files", extensions: ["md", "markdown", "mdown", "mkd", "mkdn", "txt"] },
                                { name: "All Files", extensions: ["*"] }
                            ]
                        })
                        if (!result.canceled && result.filePaths.length > 0) {
                            sendOpenFile(win, result.filePaths[0])
                        }
                    }
                },
                {
                    label: "Open Recent",
                    submenu: recentSubmenu
                },
                { type: "separator" },
                {
                    label: "Close Tab",
                    accelerator: "CmdOrCtrl+W",
                    click: () => {
                        if (win && !win.isDestroyed()) {
                            win.webContents.send("close-tab")
                        }
                    }
                },
                { type: "separator" },
                {
                    label: "Print...",
                    accelerator: "CmdOrCtrl+P",
                    click: () => {
                        if (win && !win.isDestroyed()) {
                            win.webContents.print()
                        }
                    }
                },
                { type: "separator" },
                {
                    label: "Move Tab Left",
                    accelerator: "Ctrl+Shift+PageUp",
                    click: () => sendMoveTab(win, -1)
                },
                {
                    label: "Move Tab Right",
                    accelerator: "Ctrl+Shift+PageDown",
                    click: () => sendMoveTab(win, 1)
                },
                ...(!isMac ? [{ type: "separator" }, { role: "quit" }] : [])
            ]
        },
        {
            label: "Edit",
            submenu: [
                { role: "copy" },
                { role: "selectAll" },
                { type: "separator" },
                {
                    label: "Find...",
                    accelerator: "CmdOrCtrl+F",
                    click: () => sendToggleFind(win)
                },
                { type: "separator" },
                {
                    label: "Toggle Bookmark",
                    accelerator: "CmdOrCtrl+F2",
                    click: () => sendBookmarkAction(win, "toggle")
                },
                {
                    label: "Next Bookmark",
                    accelerator: "F2",
                    click: () => sendBookmarkAction(win, "next")
                },
                {
                    label: "Previous Bookmark",
                    accelerator: "Shift+F2",
                    click: () => sendBookmarkAction(win, "prev")
                },
                {
                    label: "Clear All Bookmarks",
                    accelerator: "CmdOrCtrl+Shift+F2",
                    click: () => sendBookmarkAction(win, "clear")
                }
            ]
        },
        {
            label: "View",
            submenu: [
                {
                    label: "Toggle Table of Contents",
                    accelerator: "CmdOrCtrl+\\",
                    click: () => sendToggleToc(win)
                },
                { type: "separator" },
                {
                    label: "Theme",
                    submenu: themeSubmenu
                },
                { type: "separator" },
                { role: "zoomIn", accelerator: "CmdOrCtrl+=" },
                { role: "zoomOut" },
                { role: "resetZoom" },
                { type: "separator" },
                { role: "toggleDevTools" }
            ]
        },
        {
            label: "Window",
            submenu: [{ role: "minimize" }, ...(isMac ? [{ role: "zoom" }, { type: "separator" }, { role: "front" }] : [])]
        }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}

module.exports = { buildMenu, themes }
