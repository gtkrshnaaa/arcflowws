import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

let afkPanel: vscode.WebviewPanel | undefined;
let idleTimer: NodeJS.Timeout | undefined;
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

let immersivePanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('ArcFlowWS is now active!');

    // Register Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('arcflowws.showAfk', () => {
            showAfkScreen(context);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('arcflowws.toggleImmersive', () => {
            if (immersivePanel) {
                immersivePanel.dispose();
            } else {
                showImmersiveMode(context);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('arcflowws.openBrowser', () => {
            showBrowser(context);
        })
    );

    // Setup Idle Tracking
    setupIdleTracker(context);
}

function setupIdleTracker(context: vscode.ExtensionContext) {
    const resetTimer = () => {
        if (idleTimer) {
            clearTimeout(idleTimer);
        }
        idleTimer = setTimeout(() => {
            vscode.commands.executeCommand('arcflowws.showAfk');
        }, IDLE_TIMEOUT);
    };

    // Events that reset the idle timer
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(resetTimer));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(resetTimer));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(resetTimer));

    resetTimer();
}

function showAfkScreen(context: vscode.ExtensionContext) {
    if (afkPanel) {
        afkPanel.reveal(vscode.ViewColumn.One);
        return;
    }

    afkPanel = vscode.window.createWebviewPanel(
        'arcflowAfk',
        'AFK',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media', 'afk'))]
        }
    );

    const htmlPath = path.join(context.extensionPath, 'media', 'afk', 'afk.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');

    const cssUri = afkPanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', 'afk', 'afk.css')));
    htmlContent = htmlContent.replace('afk.css', cssUri.toString());

    afkPanel.webview.html = htmlContent;

    afkPanel.webview.onDidReceiveMessage(message => {
        if (message.command === 'dismiss') {
            afkPanel?.dispose();
        }
    });

    afkPanel.onDidDispose(() => {
        afkPanel = undefined;
    }, null, context.subscriptions);
}

function showImmersiveMode(context: vscode.ExtensionContext) {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }

    immersivePanel = vscode.window.createWebviewPanel(
        'arcflowImmersive',
        'Immersive Mode',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media', 'immersive'))]
        }
    );

    const htmlPath = path.join(context.extensionPath, 'media', 'immersive', 'immersive.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');

    const cssUri = immersivePanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', 'immersive', 'immersive.css')));
    const jsUri = immersivePanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', 'immersive', 'immersive.js')));
    
    htmlContent = htmlContent.replace('immersive.css', cssUri.toString());
    htmlContent = htmlContent.replace('immersive.js', jsUri.toString());

    immersivePanel.webview.html = htmlContent;

    immersivePanel.webview.onDidReceiveMessage(message => {
        if (message.command === 'ready') {
            immersivePanel?.webview.postMessage({
                command: 'init',
                value: activeEditor.document.getText(),
                language: activeEditor.document.languageId
            });
        } else if (message.command === 'change') {
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                activeEditor.document.positionAt(0),
                activeEditor.document.positionAt(activeEditor.document.getText().length)
            );
            edit.replace(activeEditor.document.uri, fullRange, message.value);
            vscode.workspace.applyEdit(edit);
        } else if (message.command === 'cursorChange') {
            const pos = new vscode.Position(message.ln - 1, message.col - 1);
            activeEditor.selection = new vscode.Selection(pos, pos);
            activeEditor.revealRange(new vscode.Range(pos, pos));
        }
    });

    immersivePanel.onDidDispose(() => {
        immersivePanel = undefined;
    }, null, context.subscriptions);
}

function showBrowser(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
        'arcflowBrowser',
        'ArcFlow Browser',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media', 'browser'))]
        }
    );

    const htmlPath = path.join(context.extensionPath, 'media', 'browser', 'browser.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');

    const cssUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', 'browser', 'browser.css')));
    htmlContent = htmlContent.replace('browser.css', cssUri.toString());

    panel.webview.html = htmlContent;
}

export function deactivate() {
    if (idleTimer) {
        clearTimeout(idleTimer);
    }
}
