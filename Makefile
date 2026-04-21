# ArcFlowWS VS Code Extension Makefile

.PHONY: all install compile package clean

all: install compile package

# Install dependencies
install:
	npm install

# Compile TypeScript to JavaScript
compile:
	npm run compile

# Package the extension into a .vsix file
# Using npx to ensure vsce is available without global install
package: compile
	npx -y @vscode/vsce package

# Remove build artifacts
clean:
	rm -rf out
	rm -rf *.vsix
	rm -rf node_modules
