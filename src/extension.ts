import { isNumber } from 'util';
import * as vscode from 'vscode';

type AzureSetting = {
	name: string;
	value: string;
	slotSetting: boolean | undefined;
};

function getAzureSettingsFromAppsettings(appSettings: any, delimiter: string, prefix?: string) : AzureSetting[] {
	var azureSettings: AzureSetting[] = [];
	if (appSettings === null) {
		throw new Error("Provided value is null. Cannot get Appsettings");
	}
	if (prefix === null || prefix === '' || prefix === undefined) {
		prefix = undefined;
	}
	if ((typeof appSettings !== 'object' || Array.isArray(appSettings)) && prefix === undefined) {
		throw new Error("Provided object is not an object and no prefix was set. Appsettings cannot are not arrays at root object.");
	}
	for (let key in appSettings) {
		var name = prefix ? prefix + delimiter + key : key;
		if (Array.isArray(appSettings[key]) || typeof appSettings[key] === 'object') {
			azureSettings = azureSettings.concat(getAzureSettingsFromAppsettings(appSettings[key], delimiter, name));
			continue;
		}
		if (appSettings[key] !== null) {
			azureSettings.push(
				{
					name: name,
					value: String(appSettings[key]),
					slotSetting: false
				} as AzureSetting
			);
		}
	}
	return azureSettings;
}

function setAppSettingValue(obj: any, parts: string[], value: string) {
	var part = parts[0];
	if (parts.length === 1) {
		obj[isNaN(parseInt(part)) ? part : parseInt(part)] = value;
		return obj;
	}
	if (obj[part]) {
		obj[isNaN(parseInt(part)) ? part : parseInt(part)] = setAppSettingValue(obj[part], parts.splice(1), value);
	}
	else {
		obj[isNaN(parseInt(part)) ? part : parseInt(part)] = setAppSettingValue(isNaN(parseInt(parts[1])) ? {} : [], parts.splice(1), value);
	}
	return obj;
}

function getAppsettingsFromAzureSettings(azureSettings: AzureSetting[], delimiter: string) : any {
	var appSettings: any = {};
	if (azureSettings === null) {
		throw new Error("Provided object is null. Cannot get AzureSettings");
	}
	if (!Array.isArray(azureSettings)) {
		throw new Error("Azure Settings must be an array.");
	}
	for (let obj of azureSettings) {
		var parts = obj.name.split(delimiter);
		appSettings = setAppSettingValue(appSettings, parts, obj.value);
	}
	return appSettings;
}

export function activate(context: vscode.ExtensionContext) {
	let appToAzure = vscode.commands.registerTextEditorCommand('app-settings-converter.appToAzure', (textEditor, edit) => {
		let content = textEditor.document.getText();
		let settings = {};
		try {
			settings = JSON.parse(content);
		}
		catch (ex) {
			vscode.window.showErrorMessage("Content is not in JSON format. Error: " + (ex as Error).message);
			return;
		}
		try {
			let azureSettings = getAzureSettingsFromAppsettings(settings, "__");

			let start = textEditor.document.positionAt(0);
			let end = textEditor.document.positionAt(content.length);
			let range = new vscode.Range(start, end);

			edit.replace(range, JSON.stringify(azureSettings, undefined, 2));
		}
		catch (ex) {
			vscode.window.showErrorMessage((ex as Error).message);
			return;
		}
	});

	let azureToApp = vscode.commands.registerTextEditorCommand('app-settings-converter.azureToApp', (textEditor, edit) => {
		let content = textEditor.document.getText();
		let settings = [];
		try {
			settings = JSON.parse(content);
		}
		catch (ex) {
			vscode.window.showErrorMessage("Content is not in JSON format. Error: " + (ex as Error).message);
			return;
		}
		try {
			let azureSettings = getAppsettingsFromAzureSettings(settings, "__");

			let start = textEditor.document.positionAt(0);
			let end = textEditor.document.positionAt(content.length);
			let range = new vscode.Range(start, end);

			edit.replace(range, JSON.stringify(azureSettings, undefined, 2));
		}
		catch (ex) {
			vscode.window.showErrorMessage((ex as Error).message);
			return;
		}
	});

	context.subscriptions.push(azureToApp);
	context.subscriptions.push(appToAzure);
}

// This method is called when your extension is deactivated
export function deactivate() {}
