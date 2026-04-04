import {
	test, beforeEach, assert, expect, vi,
} from 'vitest';
import {StorageItemMap} from './storage-item-map.js';

type MockFunctions = {
	mock: {lastCall?: unknown[]};
	mockResolvedValue(value: unknown): void;
	mockImplementation(fn: (...args: unknown[]) => unknown): void;
};

type OnChangedEvent = {
	clearListeners(): void;
	callListeners(changes: Record<string, unknown>, area: string): void;
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Access jest-chrome mock methods
const asMock = (fn: unknown): MockFunctions => fn as MockFunctions;

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Access jest-chrome event methods
const storageOnChanged = chrome.storage.onChanged as unknown as OnChangedEvent;

const testItem = new StorageItemMap('height');

let localGetKeys: ReturnType<typeof vi.fn<() => Promise<string[]>>>;
let syncGetKeys: ReturnType<typeof vi.fn<() => Promise<string[]>>>;

function createStorage(wholeCache: Record<string, unknown>, area: chrome.storage.AreaName = 'local') {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Narrowing to areas that have jest-chrome mocks
	asMock(chrome.storage[area as 'local' | 'sync'].get).mockImplementation(async (key: unknown) => {
		if (typeof key === 'string' && key in wholeCache) {
			return {[key]: wholeCache[key]};
		}

		return {};
	});
}

beforeEach(() => {
	vi.resetAllMocks();
	storageOnChanged.clearListeners();
	asMock(chrome.storage.local.get).mockResolvedValue({});
	asMock(chrome.storage.local.set).mockResolvedValue(undefined);
	asMock(chrome.storage.local.remove).mockResolvedValue(undefined);
	localGetKeys = vi.fn<() => Promise<string[]>>().mockResolvedValue([]);
	Object.assign(chrome.storage.local, {getKeys: localGetKeys});
	asMock(chrome.storage.sync.get).mockResolvedValue({});
	syncGetKeys = vi.fn<() => Promise<string[]>>().mockResolvedValue([]);
	Object.assign(chrome.storage.sync, {getKeys: syncGetKeys});
});

test('get() with empty storage', async () => {
	assert.equal(await testItem.get('rico'), undefined);
});

test('get() with storage', async () => {
	createStorage({
		'height:::rico': 220,
	});
	assert.equal(await testItem.get('rico'), 220);
});

test('get() with default', async () => {
	const testItem = new StorageItemMap('sign', {defaultValue: 'unknown'});
	assert.equal(await testItem.get('december'), 'unknown');
	createStorage({
		'sign:::december': 'sagittarius',
	});
	assert.equal(await testItem.get('december'), 'sagittarius');
});

test('get() with `sync` storage', async () => {
	const sync = new StorageItemMap('brands', {area: 'sync'});
	await sync.get('MacBook');

	assert.equal(asMock(chrome.storage.local.get).mock.lastCall, undefined);

	const [argument] = asMock(chrome.storage.sync.get).mock.lastCall!;
	assert.deepEqual(argument, 'brands:::MacBook');
});

test('set(x, undefined) will unset the value', async () => {
	createStorage({
		'height:::rico': 220,
	});
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Testing undefined behavior to verify unset path
	await testItem.set('rico', undefined as unknown);
	assert.equal(asMock(chrome.storage.local.set).mock.lastCall, undefined);
	const [argument] = asMock(chrome.storage.local.remove).mock.lastCall!;
	assert.deepEqual(argument, 'height:::rico');
});

test('set() with value', async () => {
	await testItem.set('rico', 250);
	const [argument1] = asMock(chrome.storage.local.set).mock.lastCall!;
	expect(argument1).toEqual({'height:::rico': 250});
});

test('remove()', async () => {
	await testItem.remove('mario');
	const [argument] = asMock(chrome.storage.local.remove).mock.lastCall!;
	assert.equal(argument, 'height:::mario');
});

test('has() returns false', async () => {
	assert.equal(await testItem.has('rico'), false);
});

test('has() returns true', async () => {
	createStorage({
		'height:::rico': 220,
	});
	assert.equal(await testItem.has('rico'), true);
});

test('keys() with empty storage', async () => {
	assert.deepEqual(await testItem.keys(), []);
});

test('keys() returns only matching secondary keys', async () => {
	localGetKeys.mockResolvedValue([
		'height:::rico',
		'height:::mario',
		'unrelated:::key',
	]);
	assert.deepEqual(await testItem.keys(), ['rico', 'mario']);
});

test('keys() uses the correct storage area', async () => {
	const sync = new StorageItemMap('brands', {area: 'sync'});
	syncGetKeys.mockResolvedValue(['brands:::MacBook', 'brands:::Dell']);
	const keys = await sync.keys();
	assert.deepEqual(keys, ['MacBook', 'Dell']);
	assert.equal(localGetKeys.mock.lastCall, undefined);
});

test('clear() removes all items with the prefix', async () => {
	localGetKeys.mockResolvedValue([
		'height:::rico',
		'height:::mario',
		'unrelated:::key',
	]);
	await testItem.clear();
	const [argument] = asMock(chrome.storage.local.remove).mock.lastCall!;
	assert.deepEqual(argument, ['height:::rico', 'height:::mario']);
});

test('clear() does nothing with empty storage', async () => {
	await testItem.clear();
	assert.equal(asMock(chrome.storage.local.remove).mock.lastCall, undefined);
});

test('onChanged() is called for the correct item', async () => {
	const name = new StorageItemMap('distance');
	const spy = vi.fn<() => void>();
	name.onChanged(spy);
	storageOnChanged.callListeners({unrelatedKey: 123}, 'local');
	expect(spy).not.toHaveBeenCalled();
	storageOnChanged.callListeners({'distance:::jupiter': 10e10}, 'sync');
	expect(spy).not.toHaveBeenCalled();
	storageOnChanged.callListeners({'distance:::jupiter': 10e10}, 'local');
	expect(spy).toHaveBeenCalled();
});

test('onChanged() is not called on Firefox when value is unchanged', async () => {
	vi.stubGlobal('navigator', {userAgent: 'Mozilla/5.0 Firefox/120.0'});
	try {
		const name = new StorageItemMap('distance');
		const spy = vi.fn<() => void>();
		name.onChanged(spy);
		storageOnChanged.callListeners({'distance:::jupiter': {newValue: 10e10, oldValue: 10e10}}, 'local');
		expect(spy).not.toHaveBeenCalled();
		storageOnChanged.callListeners({'distance:::jupiter': {newValue: 20e10, oldValue: 10e10}}, 'local');
		expect(spy).toHaveBeenCalledOnce();
	} finally {
		vi.unstubAllGlobals();
	}
});

test('throws when chrome.storage is not available', async () => {
	vi.stubGlobal('chrome', undefined);
	try {
		const expectedError = /`chrome\.storage` is not available/v;
		await expect(testItem.get('rico')).rejects.toThrow(expectedError);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Testing undefined behavior to verify unset path
		await expect(testItem.set('rico', undefined as unknown)).rejects.toThrow(expectedError);
		await expect(testItem.has('rico')).rejects.toThrow(expectedError);
		await expect(testItem.remove('rico')).rejects.toThrow(expectedError);
		await expect(testItem.keys()).rejects.toThrow(expectedError);
		await expect(testItem.clear()).rejects.toThrow(expectedError);
		expect(() => {
			testItem.onChanged(() => {
			// Intentionally empty
			});
		}).toThrow(expectedError);
	} finally {
		vi.unstubAllGlobals();
	}
});

test('entries() with empty storage', async () => {
	const items = new StorageItemMap('fruits');
	const entries: unknown[] = [];
	for await (const entry of items.entries()) {
		entries.push(entry);
	}

	assert.deepEqual(entries, []);
});

test('entries() with storage items', async () => {
	const items = new StorageItemMap('fruits');
	localGetKeys.mockResolvedValue([
		'fruits:::apple',
		'fruits:::banana',
		'other:::orange',
	]);
	createStorage({
		'fruits:::apple': 'red',
		'fruits:::banana': 'yellow',
		'other:::orange': 'orange',
	});

	const entries: unknown[] = [];
	for await (const entry of items.entries()) {
		entries.push(entry);
	}

	assert.equal(entries.length, 2);
	expect(entries).toContainEqual(['apple', 'red']);
	expect(entries).toContainEqual(['banana', 'yellow']);
});

test('async iteration using for-await-of', async () => {
	const items = new StorageItemMap('colors');
	localGetKeys.mockResolvedValue([
		'colors:::red',
		'colors:::green',
		'colors:::blue',
	]);
	createStorage({
		'colors:::red': '#FF0000',
		'colors:::green': '#00FF00',
		'colors:::blue': '#0000FF',
	});

	const collected: unknown[] = [];
	for await (const [key, value] of items) {
		collected.push([key, value]);
	}

	assert.equal(collected.length, 3);
	expect(collected).toContainEqual(['red', '#FF0000']);
	expect(collected).toContainEqual(['green', '#00FF00']);
	expect(collected).toContainEqual(['blue', '#0000FF']);
});
