import chromeP from 'webext-polyfill-kinda';

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

	has = async (secondaryKey: string): Promise<boolean> => {
		const rawStorageKey = this.getRawStorageKey(secondaryKey);
		const result = await chromeP.storage[this.areaName].get(rawStorageKey);
		return Object.hasOwn(result, rawStorageKey);
	};

	delete = async (secondaryKey: string): Promise<void> => {
		const rawStorageKey = this.getRawStorageKey(secondaryKey);
		await chromeP.storage[this.areaName].remove(rawStorageKey);
	};

	get = async (secondaryKey: string): Promise<Return> => {
		const rawStorageKey = this.getRawStorageKey(secondaryKey);
		const result = await chromeP.storage[this.areaName].get(rawStorageKey);
		if (!Object.hasOwn(result, rawStorageKey)) {
			return this.defaultValue as Return;
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Assumes the user never uses the Storage API directly for this key
		return result[rawStorageKey];
	};

	set = async (secondaryKey: string, value: Exclude<Return, undefined>): Promise<void> => {
		const rawStorageKey = this.getRawStorageKey(secondaryKey);
		await chromeP.storage[this.areaName].set({[rawStorageKey]: value});
	};

	remove = async (secondaryKey: string): Promise<void> => {
		const rawStorageKey = this.getRawStorageKey(secondaryKey);
		await chromeP.storage[this.areaName].remove(rawStorageKey);
	};

	onChanged(
		callback: (key: string, value: Exclude<Return, undefined>) => void,
		signal?: AbortSignal,
	): void {
		const changeHandler = (
			changes: Record<string, chrome.storage.StorageChange>,
			area: chrome.storage.AreaName,
		) => {
			if (area !== this.areaName) {
				return;
			}

			for (const rawKey of Object.keys(changes)) {
				const secondaryKey = this.getSecondaryStorageKey(rawKey);
				if (secondaryKey) {
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
