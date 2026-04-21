import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

let afkPanel: vscode.WebviewPanel | undefined;
let idleTimer: NodeJS.Timeout | undefined;
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

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
            vscode.window.showInformationMessage('Immersive Mode coming soon!');
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
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media', 'afk'))]
        }
    );

    const htmlPath = path.join(context.extensionPath, 'media', 'afk', 'afk.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Update resource paths
    const cssPath = afkPanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', 'afk', 'afk.css')));
    htmlContent = htmlContent.replace('afk.css', cssPath.toString());

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

export function deactivate() {
    if (idleTimer) {
        clearTimeout(idleTimer);
    }
}
