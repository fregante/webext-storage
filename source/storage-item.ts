import {assertChromeStorageAvailable, hasStorageValueChanged} from './utils.js';

export type StorageItemOptions<T> = {
	area?: chrome.storage.AreaName;
	defaultValue?: T;
};

export class StorageItem<
	/**
	Only specify this if you don't have a default value
	*/
	Base,

	/**
	The return type will be undefined unless you provide a default value
	*/
	Return = Base | undefined,
> {
	readonly area: chrome.storage.AreaName;
	readonly defaultValue?: Return;
	readonly key: string;

	constructor(
		key: string,
		{
			area = 'local',
			defaultValue,
		}: StorageItemOptions<Exclude<Return, undefined>> = {},
	) {
		this.key = key;
		this.area = area;
		this.defaultValue = defaultValue;
	}

	get #storage(): chrome.storage.StorageArea {
		assertChromeStorageAvailable();
		return chrome.storage[this.area];
	}

	async get(): Promise<Return> {
		const result = await this.#storage.get(this.key);
		// Do not use Object.hasOwn() due to https://github.com/RickyMarou/jest-webextension-mock/issues/20
		return result[this.key] === undefined ? (this.defaultValue as Return) : (result[this.key] as Return);
	}

	async set(value: Exclude<Return, undefined>): Promise<void> {
		if (value === undefined) {
			await this.#storage.remove(this.key);
		} else {
			await this.#storage.set({[this.key]: value});
		}
	}

	async has(): Promise<boolean> {
		const result = await this.#storage.get(this.key);
		// Do not use Object.hasOwn() due to https://github.com/RickyMarou/jest-webextension-mock/issues/20
		return result[this.key] !== undefined;
	}

	async remove(): Promise<void> {
		await this.#storage.remove(this.key);
	}

	onChanged(
		callback: (value: Exclude<Return, undefined>) => void,
		signal?: AbortSignal,
	): void {
		assertChromeStorageAvailable();
		const changeHandler = (
			changes: Record<string, chrome.storage.StorageChange>,
			area: chrome.storage.AreaName,
		) => {
			const changedItem = changes[this.key];
			if (changedItem && area === this.area && hasStorageValueChanged(changedItem)) {
				callback(changedItem.newValue as Exclude<Return, undefined>);
			}
		};

		chrome.storage.onChanged.addListener(changeHandler);
		signal?.addEventListener('abort', () => {
			chrome.storage.onChanged.removeListener(changeHandler);
		}, {
			once: true,
		});
	}
}
