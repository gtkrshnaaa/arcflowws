# ArcFlowWS VS Code Extension Makefile

.PHONY: all build install compile package clean

# Default target: build everything
all: build

# Comprehensive build command
build: install compile package
	@echo "Build complete! Your .vsix file is ready."

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install

# Compile TypeScript to JavaScript
compile:
	@echo "Compiling TypeScript..."
	npm run compile

# Package the extension into a .vsix file
package:
	@echo "Packaging extension..."
	npx -y @vscode/vsce package

# Remove build artifacts
clean:
	@echo "Cleaning up..."
	rm -rf out
	rm -rf *.vsix
	rm -rf node_modules
