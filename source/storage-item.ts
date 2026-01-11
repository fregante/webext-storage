import {StorageItemMap, type StorageItemMapOptions} from './storage-item-map.js';

export type StorageItemOptions<T> = StorageItemMapOptions<T>;

export class StorageItem<
	/** Only specify this if you don't have a default value */
	Base,

	/** The return type will be undefined unless you provide a default value */
	Return = Base | undefined,
> extends StorageItemMap<Base, Return> {
	private static get defaultSecondaryKey(): string {
		return '';
	}

	readonly key: string;
	readonly area: chrome.storage.AreaName;

	/** @deprecated Use `onChanged` instead */
	onChange = this.onChanged;

	constructor(
		key: string,
		options: StorageItemOptions<Exclude<Return, undefined>> = {},
	) {
		super('', options);
		this.key = key;
		this.area = this.areaName;
	}

	override async get(): Promise<Return> {
		return super.get(StorageItem.defaultSecondaryKey);
	}

	override async has(): Promise<boolean> {
		return super.has(StorageItem.defaultSecondaryKey);
	}

	override async remove(): Promise<void> {
		await super.remove(StorageItem.defaultSecondaryKey);
	}

	override onChanged(
		callback: (value: Exclude<Return, undefined>) => void,
		signal?: AbortSignal,
	): void {
		super.onChanged(callback, signal);
	}

	protected override getRawStorageKey(_secondaryKey: string): string {
		return this.key;
	}

	protected override getSecondaryStorageKey(rawKey: string): string | false {
		return rawKey === this.key ? '' : false;
	}
}
