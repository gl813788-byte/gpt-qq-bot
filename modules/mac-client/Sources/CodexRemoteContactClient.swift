import Cocoa
import WebKit

final class DragRegionView: NSView {
    override var mouseDownCanMoveWindow: Bool {
        true
    }

    override func mouseDown(with event: NSEvent) {
        window?.performDrag(with: event)
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    private var window: NSWindow!
    private var webView: WKWebView!
    private let dashboardURL = "http://127.0.0.1:3789/"
    private let hubBaseURL = "http://127.0.0.1:3789/api/state"

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        buildMenu()
        buildWindow()
        loadClient()
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "codexRemoteContactNative", let body = message.body as? [String: Any] else {
            return
        }

        let action = body["action"] as? String
        if action == "openHub" {
            NSWorkspace.shared.open(URL(string: hubBaseURL)!)
        } else if action == "reload" {
            webView.reload()
        }
    }

    private func buildWindow() {
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.userContentController.add(self, name: "codexRemoteContactNative")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.setValue(false, forKey: "drawsBackground")

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 980, height: 720),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = ""
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.toolbarStyle = .unifiedCompact
        window.isMovableByWindowBackground = true
        window.minSize = NSSize(width: 760, height: 560)
        window.center()

        let container = NSView()
        container.wantsLayer = true
        container.layer?.backgroundColor = NSColor.clear.cgColor
        webView.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(webView)

        let dragRegion = DragRegionView()
        dragRegion.translatesAutoresizingMaskIntoConstraints = false
        dragRegion.wantsLayer = true
        dragRegion.layer?.backgroundColor = NSColor.clear.cgColor
        container.addSubview(dragRegion, positioned: .above, relativeTo: webView)

        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            webView.topAnchor.constraint(equalTo: container.topAnchor),
            webView.bottomAnchor.constraint(equalTo: container.bottomAnchor),

            dragRegion.topAnchor.constraint(equalTo: container.topAnchor),
            dragRegion.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 96),
            dragRegion.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -170),
            dragRegion.heightAnchor.constraint(equalToConstant: 46)
        ])

        window.contentView = container
        window.makeKeyAndOrderFront(nil)
    }

    private func loadClient() {
        guard let url = URL(string: dashboardURL) else {
            presentFatalError("本地仪表盘地址无效")
            return
        }
        webView.load(URLRequest(url: url, cachePolicy: .reloadRevalidatingCacheData))
    }

    private func buildMenu() {
        let mainMenu = NSMenu()

        let appMenuItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(NSMenuItem(title: "关于 Codex QQ Bot", action: #selector(showAbout), keyEquivalent: ""))
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(NSMenuItem(title: "退出 Codex QQ Bot", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
        appMenuItem.submenu = appMenu

        let viewMenuItem = NSMenuItem()
        let viewMenu = NSMenu(title: "视图")
        viewMenu.addItem(NSMenuItem(title: "刷新", action: #selector(reloadClient), keyEquivalent: "r"))
        viewMenu.addItem(NSMenuItem(title: "打开 Hub API", action: #selector(openHub), keyEquivalent: "o"))
        viewMenuItem.submenu = viewMenu

        mainMenu.addItem(appMenuItem)
        mainMenu.addItem(viewMenuItem)
        NSApp.mainMenu = mainMenu
    }

    @objc private func showAbout() {
        NSAlert(
            icon: NSImage(named: NSImage.applicationIconName),
            title: "Codex QQ Bot",
            message: "QQ/OneBot 与 Codex CLI 本地助手客户端。底层使用 macOS WebKit 运行本地 JS，不需要常驻浏览器。"
        ).runModal()
    }

    @objc private func reloadClient() {
        webView.reload()
    }

    @objc private func openHub() {
        NSWorkspace.shared.open(URL(string: hubBaseURL)!)
    }

    private func presentFatalError(_ message: String) {
        let alert = NSAlert()
        alert.alertStyle = .critical
        alert.messageText = "Codex QQ Bot 启动失败"
        alert.informativeText = message
        alert.runModal()
    }
}

private extension NSAlert {
    convenience init(icon: NSImage?, title: String, message: String) {
        self.init()
        self.icon = icon
        self.messageText = title
        self.informativeText = message
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
