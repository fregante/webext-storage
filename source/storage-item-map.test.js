import {
	test, beforeEach, assert, expect, vi,
} from 'vitest';
import {StorageItemMap} from 'webext-storage';

const testItem = new StorageItemMap('height');

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
	chrome.storage.local.getKeys = vi.fn().mockResolvedValue([]);
	chrome.storage.sync.get.mockResolvedValue({});
	chrome.storage.sync.getKeys = vi.fn().mockResolvedValue([]);
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

	assert.equal(chrome.storage.local.get.mock.lastCall, undefined);

	const [argument] = chrome.storage.sync.get.mock.lastCall;
	assert.deepEqual(argument, 'brands:::MacBook');
});

test('set(x, undefined) will unset the value', async () => {
	createStorage({
		'height:::rico': 220,
	});
	assert.equal(await testItem.set('rico'), undefined);
	assert.equal(chrome.storage.local.set.mock.lastCall, undefined);
	const [argument] = chrome.storage.local.remove.mock.lastCall;
	assert.deepEqual(argument, 'height:::rico');
});

test('set() with value', async () => {
	await testItem.set('rico', 250);
	const [argument1] = chrome.storage.local.set.mock.lastCall;
	assert.deepEqual(Object.keys(argument1), ['height:::rico']);
	assert.equal(argument1['height:::rico'], 250);
});

test('remove()', async () => {
	await testItem.remove('mario');
	const [argument] = chrome.storage.local.remove.mock.lastCall;
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
	chrome.storage.local.getKeys.mockResolvedValue([
		'height:::rico',
		'height:::mario',
		'unrelated:::key',
	]);
	assert.deepEqual(await testItem.keys(), ['rico', 'mario']);
});

test('keys() uses the correct storage area', async () => {
	const sync = new StorageItemMap('brands', {area: 'sync'});
	chrome.storage.sync.getKeys.mockResolvedValue(['brands:::MacBook', 'brands:::Dell']);
	const keys = await sync.keys();
	assert.deepEqual(keys, ['MacBook', 'Dell']);
	assert.equal(chrome.storage.local.getKeys.mock.lastCall, undefined);
});

test('onChanged() is called for the correct item', async () => {
	const name = new StorageItemMap('distance');
	const spy = vi.fn();
	name.onChanged(spy);
	chrome.storage.onChanged.callListeners({unrelatedKey: 123}, 'local');
	expect(spy).not.toHaveBeenCalled();
	chrome.storage.onChanged.callListeners({'distance:::jupiter': 10e10}, 'sync');
	expect(spy).not.toHaveBeenCalled();
	chrome.storage.onChanged.callListeners({'distance:::jupiter': 10e10}, 'local');
	expect(spy).toHaveBeenCalled();
});

test('onChanged() is not called on Firefox when value is unchanged', async () => {
	vi.stubGlobal('navigator', {userAgent: 'Mozilla/5.0 Firefox/120.0'});
	try {
		const name = new StorageItemMap('distance');
		const spy = vi.fn();
		name.onChanged(spy);
		chrome.storage.onChanged.callListeners({'distance:::jupiter': {newValue: 10e10, oldValue: 10e10}}, 'local');
		expect(spy).not.toHaveBeenCalled();
		chrome.storage.onChanged.callListeners({'distance:::jupiter': {newValue: 20e10, oldValue: 10e10}}, 'local');
		expect(spy).toHaveBeenCalledOnce();
	} finally {
		vi.unstubAllGlobals();
	}
});

test('throws when chrome.storage is not available', async () => {
	const originalChrome = globalThis.chrome;
	try {
		globalThis.chrome = undefined;
		const expectedError = /`chrome\.storage` is not available/;
		await expect(testItem.get('rico')).rejects.toThrow(expectedError);
		await expect(testItem.set('rico', 250)).rejects.toThrow(expectedError);
		await expect(testItem.has('rico')).rejects.toThrow(expectedError);
		await expect(testItem.remove('rico')).rejects.toThrow(expectedError);
		await expect(testItem.keys()).rejects.toThrow(expectedError);
		expect(() => testItem.onChanged(() => {})).toThrow(expectedError);
	} finally {
		globalThis.chrome = originalChrome;
	}
});
