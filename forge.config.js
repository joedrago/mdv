const path = require("path")

module.exports = {
    packagerConfig: {
        asar: true,
        name: "Markdown Viewer",
        executableName: "mdv",
        appBundleId: "com.joedrago.mdv",
        icon: path.join(__dirname, "assets", "icon"),
        extendInfo: {
            CFBundleDocumentTypes: [
                {
                    CFBundleTypeName: "Markdown File",
                    CFBundleTypeExtensions: ["md", "markdown", "mdown", "mkd", "mkdn"],
                    CFBundleTypeRole: "Viewer",
                    LSHandlerRank: "Alternate"
                }
            ]
        }
    },
    rebuildConfig: {},
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            config: {
                name: "mdv"
            }
        },
        {
            name: "@electron-forge/maker-zip",
            platforms: ["darwin"]
        },
        {
            name: "@electron-forge/maker-deb",
            config: {
                mimeType: ["text/markdown"],
                options: {
                    name: "mdv",
                    icon: path.join(__dirname, "assets", "icon.png")
                }
            }
        },
        {
            name: "@electron-forge/maker-zip",
            platforms: ["linux"]
        }
    ]
}
