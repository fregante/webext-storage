import {assertChromeStorageAvailable, hasStorageValueChanged} from './utils.js';

export type StorageItemMapOptions<T> = {
	area?: chrome.storage.AreaName;
	defaultValue?: T;
};

export class StorageItemMap<
	/** Only specify this if you don't have a default value */
	Base,

	/** The return type will be undefined unless you provide a default value */
	Return = Base | undefined,
> {
	readonly prefix: `${string}:::`;
	readonly areaName: chrome.storage.AreaName;
	readonly defaultValue?: Return;

	get #storage(): chrome.storage.StorageArea {
		assertChromeStorageAvailable();
		return chrome.storage[this.areaName];
	}

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
		if (result[rawStorageKey] === undefined) {
			return this.defaultValue as Return;
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Assumes the user never uses the Storage API directly for this key
		return result[rawStorageKey];
	}

	async set(secondaryKey: string, value: Exclude<Return, undefined>): Promise<void> {
		const rawStorageKey = this.getRawStorageKey(secondaryKey);
		// eslint-disable-next-line unicorn/prefer-ternary -- ur rong
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

	/** @deprecated Only here to match the Map API; use `remove` instead */
	async delete(secondaryKey: string): Promise<void> {
		return this.remove(secondaryKey);
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

			for (const rawKey of Object.keys(changes)) {
				const secondaryKey = this.getSecondaryStorageKey(rawKey);
				if (secondaryKey && hasStorageValueChanged(changes[rawKey]!)) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Assumes the user never uses the Storage API directly
					callback(secondaryKey, changes[rawKey]!.newValue);
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

	private getRawStorageKey(secondaryKey: string): string {
		return this.prefix + secondaryKey;
	}

	private getSecondaryStorageKey(rawKey: string): string | false {
		return rawKey.startsWith(this.prefix) && rawKey.slice(this.prefix.length);
	}
}
