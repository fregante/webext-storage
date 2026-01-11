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

	// Store references to parent methods before overriding
	private readonly _superGet: (secondaryKey: string) => Promise<Return>;
	private readonly _superSet: (secondaryKey: string, value: Exclude<Return, undefined>) => Promise<void>;
	private readonly _superHas: (secondaryKey: string) => Promise<boolean>;
	private readonly _superRemove: (secondaryKey: string) => Promise<void>;
	private readonly _superOnChanged: (callback: (key: string, value: Exclude<Return, undefined>) => void, signal?: AbortSignal) => void;

	constructor(
		key: string,
		options: StorageItemOptions<Exclude<Return, undefined>> = {},
	) {
		super('', options);
		this.key = key;
		this.area = this.areaName;

		// Save references to parent methods
		this._superGet = super.get;
		this._superSet = super.set;
		this._superHas = super.has;
		this._superRemove = super.remove;
		this._superOnChanged = super.onChanged;
	}

	// Override parent methods to match StorageItem's API (no secondaryKey parameter)
	override get = async (): Promise<Return> => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Assumes the user never uses the Storage API directly
		return this._superGet(StorageItem.defaultSecondaryKey);
	};

	// @ts-expect-error - Overriding with different signature for single-key API
	override set = async (value: Exclude<Return, undefined>): Promise<void> => {
		await this._superSet(StorageItem.defaultSecondaryKey, value);
	};

	override has = async (): Promise<boolean> => this._superHas(StorageItem.defaultSecondaryKey);

	override remove = async (): Promise<void> => {
		await this._superRemove(StorageItem.defaultSecondaryKey);
	};

	// @ts-expect-error - Overriding with different signature for single-key API
	override onChanged(
		callback: (value: Exclude<Return, undefined>) => void,
		signal?: AbortSignal,
	): void {
		this._superOnChanged((_key, value) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Assumes the user never uses the Storage API directly
			callback(value);
		}, signal);
	}

	protected override getRawStorageKey(_secondaryKey: string): string {
		return this.key;
	}

	protected override getSecondaryStorageKey(rawKey: string): string | false {
		return rawKey === this.key ? '' : false;
	}
}
