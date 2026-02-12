import {
	test, beforeEach, assert, expect, vi,
} from 'vitest';
import {StorageItemMap} from 'webext-storage';

const testItem = new StorageItemMap('height');

function createStorage(wholeCache, area = 'local') {
	for (const [key, data] of Object.entries(wholeCache)) {
		chrome.storage[area].get
			.withArgs(key)
			.yields({[key]: data});
	}
}

beforeEach(() => {
	chrome.flush();
	chrome.storage.local.get.yields({});
	chrome.storage.local.set.yields(undefined);
	chrome.storage.local.remove.yields(undefined);
	chrome.storage.sync.get.yields({});
});

test('get() with empty storage', async () => {
	assert.equal(await testItem.get('rico'), undefined);
});

test('get() with storage', async () => {
	createStorage({
		'height:::rico': 220,
	});
	assert.equal(await testItem.get('rico'), 220);
	assert.equal(await (0, testItem.get)('rico'), 220, 'get method should be bound');
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

	assert.equal(chrome.storage.local.get.lastCall, undefined);

	const [argument] = chrome.storage.sync.get.lastCall.args;
	assert.deepEqual(argument, 'brands:::MacBook');
});

test('set(x, undefined) will unset the value', async () => {
	createStorage({
		'height:::rico': 220,
	});
	assert.equal(await testItem.set('rico'), undefined);
	assert.equal(chrome.storage.local.set.lastCall, undefined);
	const [argument] = chrome.storage.local.remove.lastCall.args;
	assert.deepEqual(argument, 'height:::rico');
});

test('set() with value', async () => {
	await testItem.set('rico', 250);
	const [argument1] = chrome.storage.local.set.lastCall.args;
	assert.deepEqual(Object.keys(argument1), ['height:::rico']);
	assert.equal(argument1['height:::rico'], 250);

	await (0, testItem.set)('luigi', 120);
	const [argument2] = chrome.storage.local.set.lastCall.args;
	assert.equal(argument2['height:::luigi'], 120, 'get method should be bound');
});

test('remove()', async () => {
	await testItem.remove('mario');
	const [argument] = chrome.storage.local.remove.lastCall.args;
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
	assert.equal(await (0, testItem.has)('rico'), true, 'get method should be bound');
});

test('onChanged() is called for the correct item', async () => {
	const name = new StorageItemMap('distance');
	const spy = vi.fn();
	name.onChanged(spy);
	chrome.storage.onChanged.trigger({unrelatedKey: 123}, 'local');
	expect(spy).not.toHaveBeenCalled();
	chrome.storage.onChanged.trigger({'distance:::jupiter': 10e10}, 'sync');
	expect(spy).not.toHaveBeenCalled();
	chrome.storage.onChanged.trigger({'distance:::jupiter': 10e10}, 'local');
	expect(spy).toHaveBeenCalled();
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
	const wholeCache = {
		'fruits:::apple': 'red',
		'fruits:::banana': 'yellow',
		'other:::orange': 'orange',
	};
	createStorage(wholeCache);
	// Mock get() without arguments to return all items
	chrome.storage.local.get.withArgs().yields(wholeCache);
	chrome.storage.local.get.withArgs(undefined).yields(wholeCache);

	const entries = [];
	for await (const entry of items.entries()) {
		entries.push(entry);
	}

	assert.equal(entries.length, 2);
	assert.deepEqual(entries, [
		['apple', 'red'],
		['banana', 'yellow'],
	]);
});

test('async iteration using for-await-of', async () => {
	const items = new StorageItemMap('colors');
	const wholeCache = {
		'colors:::red': '#FF0000',
		'colors:::green': '#00FF00',
		'colors:::blue': '#0000FF',
	};
	createStorage(wholeCache);
	// Mock get() without arguments to return all items
	chrome.storage.local.get.withArgs().yields(wholeCache);
	chrome.storage.local.get.withArgs(undefined).yields(wholeCache);

	const collected = [];
	for await (const [key, value] of items) {
		collected.push([key, value]);
	}

	assert.equal(collected.length, 3);
	expect(collected).toContainEqual(['red', '#FF0000']);
	expect(collected).toContainEqual(['green', '#00FF00']);
	expect(collected).toContainEqual(['blue', '#0000FF']);
});

test('entries() method should be bound', async () => {
	const items = new StorageItemMap('test');
	const wholeCache = {'test:::key': 'value'};
	createStorage(wholeCache);
	chrome.storage.local.get.withArgs().yields(wholeCache);
	chrome.storage.local.get.withArgs(undefined).yields(wholeCache);

	// Extract the method and call it (testing binding like other tests do)
	const result = [];
	for await (const entry of (0, items.entries)()) {
		result.push(entry);
	}

	assert.equal(result.length, 1);
	assert.deepEqual(result[0], ['key', 'value']);
});
