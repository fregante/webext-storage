import {
	test, beforeEach, assert, expect, vi,
} from 'vitest';
import {StorageItem} from 'webext-storage';

const testItem = new StorageItem('name');

function createStorage(wholeCache, area = 'local') {
	chrome.storage[area].get.mockImplementation(key => {
		if (key in wholeCache) {
			return Promise.resolve({[key]: wholeCache[key]});
		}

		return Promise.resolve({});
	});
}

beforeEach(() => {
	vi.resetAllMocks();
	chrome.storage.onChanged.clearListeners();
	chrome.storage.local.get.mockResolvedValue({});
	chrome.storage.local.set.mockResolvedValue(undefined);
	chrome.storage.local.remove.mockResolvedValue(undefined);
	chrome.storage.sync.get.mockResolvedValue({});
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

	assert.equal(chrome.storage.local.get.mock.lastCall, undefined);

	const [argument] = chrome.storage.sync.get.mock.lastCall;
	assert.deepEqual(argument, 'name');
});

test('set(undefined) will unset the value', async () => {
	createStorage({
		name: 'Rico',
	});
	assert.equal(await testItem.set(), undefined);
	assert.equal(chrome.storage.local.set.mock.lastCall, undefined);
	const [argument] = chrome.storage.local.remove.mock.lastCall;
	assert.deepEqual(argument, 'name');
});

test('set() with value', async () => {
	await testItem.set('Anne');
	const [argument1] = chrome.storage.local.set.mock.lastCall;
	assert.deepEqual(Object.keys(argument1), ['name']);
	assert.equal(argument1.name, 'Anne');
});

test('remove()', async () => {
	await testItem.remove();
	const [argument] = chrome.storage.local.remove.mock.lastCall;
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
	const spy = vi.fn();
	name.onChanged(spy);
	chrome.storage.onChanged.callListeners({unrelatedKey: 123}, 'local');
	expect(spy).not.toHaveBeenCalled();
	chrome.storage.onChanged.callListeners({name: 'Anne'}, 'sync');
	expect(spy).not.toHaveBeenCalled();
	chrome.storage.onChanged.callListeners({name: 'Anne'}, 'local');
	expect(spy).toHaveBeenCalled();
});

test('throws when chrome.storage is not available', async () => {
	const originalChrome = globalThis.chrome;
	try {
		globalThis.chrome = undefined;
		const expectedError = /`chrome\.storage` is not available/;
		await expect(testItem.get()).rejects.toThrow(expectedError);
		await expect(testItem.set('value')).rejects.toThrow(expectedError);
		await expect(testItem.has()).rejects.toThrow(expectedError);
		await expect(testItem.remove()).rejects.toThrow(expectedError);
		expect(() => testItem.onChanged(() => {})).toThrow(expectedError);
	} finally {
		globalThis.chrome = originalChrome;
	}
});
