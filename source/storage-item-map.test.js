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
