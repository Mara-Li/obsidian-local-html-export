import {MarkdownView, Plugin, sanitizeHTMLToDom} from "obsidian";
import {DEFAULT_SETTINGS, type LocalHtmlSettings} from "./interfaces";
import {LocalHtmlSettingTab} from "./settings";

export default class LocalHtmlExport extends Plugin {
	settings!: LocalHtmlSettings;
	
	cloneMetadataContainer(copy: HTMLElement|undefined) {
		const metadataContainer = copy?.querySelector(".metadata-container");
			if (metadataContainer) {
				//get the "data-property-key" and set it as text in place of the input
				const allPropertyKeys = metadataContainer.querySelectorAll("[data-property-key]");
				for (const keys of allPropertyKeys) {
					const input = keys.querySelector("input");
					if (input) {
						const type = input.getAttribute("type");
						const text = input.value;
						//set value as text
						input.replaceWith(sanitizeHTMLToDom(`<span class="metadata-property-key-input exported-html" autocapitalize="none" enterkeyhint="next" type="${type}" aria-label="${text}">${text}</span>`));
					}
				}
				//fix checkbox
				const allCheckboxes = metadataContainer.querySelectorAll(".metadata-input-checkbox");
				for (const checkbox of allCheckboxes) {
					//set the checkbox as checked
					const checked = (checkbox as HTMLInputElement).checked;
					//set the checkbox as checked and disable it
					if (checked) checkbox.setAttribute("checked", `true`);
					checkbox.setAttribute("disabled", "true");
				}
			}
			//also disable all inputs
			const allInputs = metadataContainer?.querySelectorAll(".metadata-property-value");
			for (const input of allInputs ?? []) {
				input.children[0].setAttribute("disabled", "true");
				input.children[0].setAttribute("contenteditable", "false");
				input.querySelectorAll(".multi-select-input").forEach((el) => {
					el.setAttribute("disabled", "true");
					el.setAttribute("contenteditable", "false");
				});
			}
		return copy;
	}
	
	getHtmlContent(markdownView: MarkdownView) {
		//switch to preview mode if not already
		
		const markdownContainer = markdownView.containerEl.querySelector(".view-content .markdown-reading-view");
		//clone the container to remove the metadata
		let copy = markdownContainer?.cloneNode(true) as HTMLElement | undefined;
		if (!this.settings.exportFrontmatter) {
			//get the metadata container and remove it
			const metadataContainer = copy?.querySelector(".metadata-container");
			if (metadataContainer) metadataContainer.remove();
		} else {
			copy = this.cloneMetadataContainer(copy);
		}
		const title = copy?.querySelector(".inline-title");
		if (title) {
			title.setAttribute("contenteditable", "false");
			title.setAttribute("disabled", "true");
			title.setAttribute("spellcheck", "false");
		}
		return this.fixEmbedHtml(copy);
	}
	
	fixEmbedHtml(copy: HTMLElement | undefined) {
		//remove embed title
		const allEmbedsTitle = copy?.querySelectorAll(".embed-title, .markdown-embed-link, .file-embed-link");
		for (const title of allEmbedsTitle ?? []) {
			title.remove();
		}
		//set embed class container
		const allEmbeds = copy?.querySelectorAll(".markdown-embed-content");
		for (const embed of allEmbeds ?? []) {
			embed.classList.remove("markdown-embed-content");
			embed.classList.add("markdown-embed");
		}
		
		return copy?.getHTML();
	}
	
	async getAppCss() {
		const rep = await fetch("../app.css");
		if (!rep.ok) {
			throw new Error(`HTTP error! Unable to fetch app.css: ${rep.status}`);
		}
		return await rep.text();
	}
	
	getHead(markdownView: MarkdownView) {
		//get the css by the dom
		const container = markdownView.containerEl.doc;
		return container.head;
	}
	
	getBodyStyle(markdownView: MarkdownView) {
		//get the css by the dom
		const container = markdownView.containerEl.doc;
		return container.body.style;
	}
	
	getBodyClass(markdownView: MarkdownView) {
		//get the css by the dom
		const container = markdownView.containerEl.doc;
		return container.body.className;
	}
	
	removeCommentCss(css: string) {
		//remove the comments from the css
		return css.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "");
	}
	
	async createHtmlContent(markdownView: MarkdownView) {
		//create a html file with the markdown content
		const htmlContent = this.getHtmlContent(markdownView);
		const head = this.getHead(markdownView).getHTML();
		const bodyStyle = this.getBodyStyle(markdownView).cssText;
		const bodyClass = this.getBodyClass(markdownView);
		const appCss = await this.getAppCss();
		const lang = markdownView.containerEl.doc.head.lang;
		return `
		<!DOCTYPE html>
		<html lang="${lang}">
		<style>${appCss}</style>
		${this.removeCommentCss(head)}
		<body class="${bodyClass}" style="${bodyStyle.replaceAll('"', "'")}">
			${htmlContent}
		</body>
		</html>
		`;
	}

	async onload() {
		console.log(`[${this.manifest.name}] Loaded`)
		await this.loadSettings();
		this.addSettingTab(new LocalHtmlSettingTab(this.app, this));
		this.addCommand({
			id: "export-html",
			name: "Export HTML",
			//@ts-ignore
			checkCallback: async (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				
				if (markdownView) {
					if (!checking) {
						// Do the actual work
						const file = markdownView.file;
						if (file) {
							const mode = markdownView.getMode();
							//@ts-ignore
							if (mode === "source") await this.app.commands.executeCommandById("markdown:toggle-preview");
							
							const htmlContent = await this.createHtmlContent(markdownView);
							//@ts-ignore
							if (mode === "source") this.app.commands.executeCommandById("markdown:toggle-preview");
							const fileName = file.basename;
							const blob = new Blob([htmlContent], { type: "text/html" });
							const url = URL.createObjectURL(blob);
							const a = document.createElement("a");
							a.href = url;
							a.download = `${fileName}.html`;
							document.body.appendChild(a);
							a.click();
							document.body.removeChild(a);
							URL.revokeObjectURL(url);
							
						}
					}
					return true;
				}
			}
		});
		
	}

	onunload() {
		console.log(`[${this.manifest.name}] Unloaded`);
	}
	
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	
	async saveSettings() {
		await this.saveData(this.settings);
	}
}


