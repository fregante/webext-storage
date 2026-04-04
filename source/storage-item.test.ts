import {
	test, beforeEach, assert, expect, vi,
} from 'vitest';
import {StorageItem} from './storage-item.js';

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

const testItem = new StorageItem('name');

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
	asMock(chrome.storage.sync.get).mockResolvedValue({});
});

test('get() with empty storage', async () => {
	assert.equal(await testItem.get(), undefined);
});

test('get() with storage', async () => {
	createStorage({
		name: 'Rico',
	});
	assert.equal(await testItem.get(), 'Rico');
});

test('get() with default', async () => {
	const testItem = new StorageItem('name', {defaultValue: 'Anne'});
	assert.equal(await testItem.get(), 'Anne');
	createStorage({
		name: 'Rico',
	});
	assert.equal(await testItem.get(), 'Rico');
});

test('get() with `sync` storage', async () => {
	const sync = new StorageItem('name', {area: 'sync'});
	await sync.get();

	assert.equal(asMock(chrome.storage.local.get).mock.lastCall, undefined);

	const [argument] = asMock(chrome.storage.sync.get).mock.lastCall!;
	assert.deepEqual(argument, 'name');
});

test('set(undefined) will unset the value', async () => {
	createStorage({
		name: 'Rico',
	});
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Testing undefined behavior to verify unset path
	await testItem.set(undefined as unknown);
	assert.equal(asMock(chrome.storage.local.set).mock.lastCall, undefined);
	const [argument] = asMock(chrome.storage.local.remove).mock.lastCall!;
	assert.deepEqual(argument, 'name');
});

test('set() with value', async () => {
	await testItem.set('Anne');
	const [argument1] = asMock(chrome.storage.local.set).mock.lastCall!;
	expect(argument1).toEqual({name: 'Anne'});
});

test('remove()', async () => {
	await testItem.remove();
	const [argument] = asMock(chrome.storage.local.remove).mock.lastCall!;
	assert.equal(argument, 'name');
});

test('has() returns false', async () => {
	createStorage({});
	assert.equal(await testItem.has(), false);
});

test('has() returns true', async () => {
	createStorage({
		name: 'Rico',
	});
	assert.equal(await testItem.has(), true);
});

test('onChanged() is called for the correct item', async () => {
	const name = new StorageItem('name');
	const spy = vi.fn<() => void>();
	name.onChanged(spy);
	storageOnChanged.callListeners({unrelatedKey: 123}, 'local');
	expect(spy).not.toHaveBeenCalled();
	storageOnChanged.callListeners({name: 'Anne'}, 'sync');
	expect(spy).not.toHaveBeenCalled();
	storageOnChanged.callListeners({name: 'Anne'}, 'local');
	expect(spy).toHaveBeenCalled();
});

test('onChanged() is not called on Firefox when value is unchanged', async () => {
	vi.stubGlobal('navigator', {userAgent: 'Mozilla/5.0 Firefox/120.0'});
	try {
		const name = new StorageItem('name');
		const spy = vi.fn<() => void>();
		name.onChanged(spy);
		storageOnChanged.callListeners({name: {newValue: 'Anne', oldValue: 'Anne'}}, 'local');
		expect(spy).not.toHaveBeenCalled();
		storageOnChanged.callListeners({name: {newValue: 'Bob', oldValue: 'Anne'}}, 'local');
		expect(spy).toHaveBeenCalledOnce();
	} finally {
		vi.unstubAllGlobals();
	}
});

test('throws when chrome.storage is not available', async () => {
	vi.stubGlobal('chrome', undefined);
	try {
		const expectedError = /`chrome\.storage` is not available/v;
		await expect(testItem.get()).rejects.toThrow(expectedError);
		await expect(testItem.set('value')).rejects.toThrow(expectedError);
		await expect(testItem.has()).rejects.toThrow(expectedError);
		await expect(testItem.remove()).rejects.toThrow(expectedError);
		expect(() => {
			testItem.onChanged(() => {
				// Intentionally empty
			});
		}).toThrow(expectedError);
	} finally {
		vi.unstubAllGlobals();
	}
});
