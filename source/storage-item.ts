import {StorageItemMap, type StorageItemMapOptions} from './storage-item-map.js';

export type StorageItemOptions<T> = StorageItemMapOptions<T>;

export class StorageItem<
	/** Only specify this if you don't have a default value */
	Base,

	/** The return type will be undefined unless you provide a default value */
	Return = Base | undefined,
> {
	private static get defaultSecondaryKey(): string {
		return '';
	}

	readonly key: string;
	readonly area: chrome.storage.AreaName;
	readonly defaultValue?: Return;

	/** @deprecated Use `onChanged` instead */
	onChange = this.onChanged;

	private readonly _map: StorageItemMap<Base, Return>;

	constructor(
		key: string,
		options: StorageItemOptions<Exclude<Return, undefined>> = {},
	) {
		// Use composition with a custom StorageItemMap subclass
		// that overrides getRawStorageKey to return our key directly
		this._map = new (class extends StorageItemMap<Base, Return> {
			protected override getRawStorageKey(_secondaryKey: string): string {
				return key;
			}

			protected override getSecondaryStorageKey(rawKey: string): string | false {
				return rawKey === key ? '' : false;
			}
		})('', options);

		this.key = key;
		this.area = this._map.areaName;
		this.defaultValue = this._map.defaultValue;
	}

	get = async (): Promise<Return> => this._map.get(StorageItem.defaultSecondaryKey);

	set = async (value: Exclude<Return, undefined>): Promise<void> =>
		this._map.set(StorageItem.defaultSecondaryKey, value);

	has = async (): Promise<boolean> => this._map.has(StorageItem.defaultSecondaryKey);

	remove = async (): Promise<void> => this._map.remove(StorageItem.defaultSecondaryKey);

	onChanged(
		callback: (value: Exclude<Return, undefined>) => void,
		signal?: AbortSignal,
	): void {
		this._map.onChanged((_key, value) => {
			callback(value);
		}, signal);
	}
}
