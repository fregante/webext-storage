import {assertChromeStorageAvailable, hasStorageValueChanged} from './utils.js';

export type StorageItemMapOptions<T> = {
	area?: chrome.storage.AreaName;
	defaultValue?: T;
};

export class StorageItemMap<
	/**
	Only specify this if you don't have a default value
	*/
	Base,

	/**
	The return type will be undefined unless you provide a default value
	*/
	Return = Base | undefined,
> {
	readonly prefix: `${string}:::`;
	readonly areaName: chrome.storage.AreaName;
	readonly defaultValue?: Return;

	constructor(
		key: string,
		{
			area = 'local',
			defaultValue,
		}: StorageItemMapOptions<Exclude<Return, undefined>> = {},
	) {
		this.prefix = `${key}:::`;
		this.areaName = area;
		this.defaultValue = defaultValue;
	}

	get #storage(): chrome.storage.StorageArea {
		assertChromeStorageAvailable();
		return chrome.storage[this.areaName];
	}

	private getRawStorageKey(secondaryKey: string): string {
		return this.prefix + secondaryKey;
	}

	private getSecondaryStorageKey(rawKey: string): string | false {
		return rawKey.startsWith(this.prefix) && rawKey.slice(this.prefix.length);
	}

	async #getRawKeys(): Promise<string[]> {
		const allKeys = await this.#storage.getKeys();
		return allKeys.filter(key => key.startsWith(this.prefix));
	}

	async has(secondaryKey: string): Promise<boolean> {
		const rawStorageKey = this.getRawStorageKey(secondaryKey);
		const result = await this.#storage.get(rawStorageKey);
		// Do not use Object.hasOwn() due to https://github.com/RickyMarou/jest-webextension-mock/issues/20
		return result[rawStorageKey] !== undefined;
	}

	async get(secondaryKey: string): Promise<Return> {
		const rawStorageKey = this.getRawStorageKey(secondaryKey);
		const result = await this.#storage.get(rawStorageKey);
		// Do not use Object.hasOwn() due to https://github.com/RickyMarou/jest-webextension-mock/issues/20
		return result[rawStorageKey] === undefined ? (this.defaultValue as Return) : (result[rawStorageKey] as Return);
	}

	async set(secondaryKey: string, value: Exclude<Return, undefined>): Promise<void> {
		const rawStorageKey = this.getRawStorageKey(secondaryKey);

		if (value === undefined) {
			await this.#storage.remove(rawStorageKey);
		} else {
			await this.#storage.set({[rawStorageKey]: value});
		}
	}

	async remove(secondaryKey: string): Promise<void> {
		const rawStorageKey = this.getRawStorageKey(secondaryKey);
		await this.#storage.remove(rawStorageKey);
	}

	/**
	Alias of `remove`, only here to match the Map API.

	@deprecated Use `remove` instead
	*/
	async delete(secondaryKey: string): Promise<void> {
		return this.remove(secondaryKey);
	}

	async keys(): Promise<string[]> {
		const rawKeys = await this.#getRawKeys();
		return rawKeys.map(key => key.slice(this.prefix.length));
	}

	async clear(): Promise<void> {
		const rawKeys = await this.#getRawKeys();
		if (rawKeys.length > 0) {
			await this.#storage.remove(rawKeys);
		}
	}

	async * entries(): AsyncIterableIterator<[string, Exclude<Return, undefined>]> {
		const secondaryKeys = await this.keys();

		for (const secondaryKey of secondaryKeys) {
			// eslint-disable-next-line no-await-in-loop -- Intentionally fetching one value at a time to avoid loading all storage at once
			const value = await this.get(secondaryKey);

			yield [secondaryKey, value as Exclude<Return, undefined>];
		}
	}

	[Symbol.asyncIterator](): AsyncIterableIterator<[string, Exclude<Return, undefined>]> {
		return this.entries();
	}

	onChanged(
		callback: (key: string, value: Exclude<Return, undefined>) => void,
		signal?: AbortSignal,
	): void {
		assertChromeStorageAvailable();
		const changeHandler = (
			changes: Record<string, chrome.storage.StorageChange>,
			area: chrome.storage.AreaName,
		) => {
			if (area !== this.areaName) {
				return;
			}

			for (const [rawKey, change] of Object.entries(changes)) {
				const secondaryKey = this.getSecondaryStorageKey(rawKey);
				if (secondaryKey !== false && secondaryKey !== '' && hasStorageValueChanged(change)) {
					callback(secondaryKey, change.newValue as Exclude<Return, undefined>);
				}
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
