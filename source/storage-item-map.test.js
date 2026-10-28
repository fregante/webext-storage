import assert from 'node:assert/strict';
import {test, beforeEach} from 'node:test';
import {createChrome, stubUserAgent} from '../chrome-mock.js';
import {StorageItemMap} from 'webext-storage';

const testItem = new StorageItemMap('height');

function createStorage(wholeCache, area = 'local') {
	chrome.storage[area].get.mock.mockImplementation(async key => {
		if (key in wholeCache) {
			return {[key]: wholeCache[key]};
		}

		return {};
	});
}

beforeEach(t => {
	globalThis.chrome = createChrome(t.mock);
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

	assert.equal(chrome.storage.local.get.mock.callCount(), 0);

	const [argument] = chrome.storage.sync.get.mock.calls.at(-1).arguments;
	assert.deepEqual(argument, 'brands:::MacBook');
});

test('set(x, undefined) will unset the value', async () => {
	createStorage({
		'height:::rico': 220,
	});
	assert.equal(await testItem.set('rico'), undefined);
	assert.equal(chrome.storage.local.set.mock.callCount(), 0);
	const [argument] = chrome.storage.local.remove.mock.calls.at(-1).arguments;
	assert.deepEqual(argument, 'height:::rico');
});

test('set() with value', async () => {
	await testItem.set('rico', 250);
	const [argument1] = chrome.storage.local.set.mock.calls.at(-1).arguments;
	assert.deepEqual(Object.keys(argument1), ['height:::rico']);
	assert.equal(argument1['height:::rico'], 250);
});

test('remove()', async () => {
	await testItem.remove('mario');
	const [argument] = chrome.storage.local.remove.mock.calls.at(-1).arguments;
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
	chrome.storage.local.getKeys.mock.mockImplementation(async () => [
		'height:::rico',
		'height:::mario',
		'unrelated:::key',
	]);
	assert.deepEqual(await testItem.keys(), ['rico', 'mario']);
});

test('keys() uses the correct storage area', async () => {
	const sync = new StorageItemMap('brands', {area: 'sync'});
	chrome.storage.sync.getKeys.mock.mockImplementation(async () => ['brands:::MacBook', 'brands:::Dell']);
	const keys = await sync.keys();
	assert.deepEqual(keys, ['MacBook', 'Dell']);
	assert.equal(chrome.storage.local.getKeys.mock.callCount(), 0);
});

test('clear() removes all items with the prefix', async () => {
	chrome.storage.local.getKeys.mock.mockImplementation(async () => [
		'height:::rico',
		'height:::mario',
		'unrelated:::key',
	]);
	await testItem.clear();
	const [argument] = chrome.storage.local.remove.mock.calls.at(-1).arguments;
	assert.deepEqual(argument, ['height:::rico', 'height:::mario']);
});

test('clear() does nothing with empty storage', async () => {
	await testItem.clear();
	assert.equal(chrome.storage.local.remove.mock.callCount(), 0);
});

test('onChanged() is called for the correct item', async t => {
	const name = new StorageItemMap('distance');
	const spy = t.mock.fn();
	name.onChanged(spy);
	chrome.storage.onChanged.callListeners({unrelatedKey: 123}, 'local');
	assert.equal(spy.mock.callCount(), 0);
	chrome.storage.onChanged.callListeners({'distance:::jupiter': 10e10}, 'sync');
	assert.equal(spy.mock.callCount(), 0);
	chrome.storage.onChanged.callListeners({'distance:::jupiter': 10e10}, 'local');
	assert.equal(spy.mock.callCount(), 1);
});

test('onChanged() is not called on Firefox when value is unchanged', async t => {
	const restoreUserAgent = stubUserAgent('Mozilla/5.0 Firefox/120.0');
	try {
		const name = new StorageItemMap('distance');
		const spy = t.mock.fn();
		name.onChanged(spy);
		chrome.storage.onChanged.callListeners({'distance:::jupiter': {newValue: 10e10, oldValue: 10e10}}, 'local');
		assert.equal(spy.mock.callCount(), 0);
		chrome.storage.onChanged.callListeners({'distance:::jupiter': {newValue: 20e10, oldValue: 10e10}}, 'local');
		assert.equal(spy.mock.callCount(), 1);
	} finally {
		restoreUserAgent();
	}
});

test('throws when chrome.storage is not available', async () => {
	const originalChrome = globalThis.chrome;
	try {
		globalThis.chrome = undefined;
		const expectedError = /`chrome\.storage` is not available/;
		await assert.rejects(testItem.get('rico'), expectedError);
		await assert.rejects(testItem.set('rico', 250), expectedError);
		await assert.rejects(testItem.has('rico'), expectedError);
		await assert.rejects(testItem.remove('rico'), expectedError);
		await assert.rejects(testItem.keys(), expectedError);
		await assert.rejects(testItem.clear(), expectedError);
		assert.throws(() => testItem.onChanged(() => {}), expectedError);
	} finally {
		globalThis.chrome = originalChrome;
	}
});

test('entries() with empty storage', async () => {
	const items = new StorageItemMap('fruits');
	const entries = [];
	for await (const entry of items.entries()) {
		entries.push(entry);
	}

	assert.deepEqual(entries, []);
});

test('entries() with storage items', async () => {
	const items = new StorageItemMap('fruits');
	chrome.storage.local.getKeys.mock.mockImplementation(async () => [
		'fruits:::apple',
		'fruits:::banana',
		'other:::orange',
	]);
	createStorage({
		'fruits:::apple': 'red',
		'fruits:::banana': 'yellow',
		'other:::orange': 'orange',
	});

	const entries = [];
	for await (const entry of items.entries()) {
		entries.push(entry);
	}

	assert.equal(entries.length, 2);
	assert.deepEqual(entries.toSorted(), [
		['apple', 'red'],
		['banana', 'yellow'],
	]);
});

test('async iteration using for-await-of', async () => {
	const items = new StorageItemMap('colors');
	chrome.storage.local.getKeys.mock.mockImplementation(async () => [
		'colors:::red',
		'colors:::green',
		'colors:::blue',
	]);
	createStorage({
		'colors:::red': '#FF0000',
		'colors:::green': '#00FF00',
		'colors:::blue': '#0000FF',
	});

	const collected = [];
	for await (const [key, value] of items) {
		collected.push([key, value]);
	}

	assert.equal(collected.length, 3);
	assert.deepEqual(collected.toSorted(), [
		['blue', '#0000FF'],
		['green', '#00FF00'],
		['red', '#FF0000'],
	]);
});
