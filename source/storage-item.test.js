import {
	test, beforeEach, assert, expect, vi,
} from 'vitest';
import {StorageItem} from 'webext-storage';

const testItem = new StorageItem('name');

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
	assert.equal(await testItem.get(), undefined);
});

test('get() with storage', async () => {
	createStorage({
		name: 'Rico',
	});
	assert.equal(await testItem.get(), 'Rico');
	assert.equal(await (0, testItem.get)(), 'Rico', 'get method should be bound');
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

	assert.equal(chrome.storage.local.get.lastCall, undefined);

	const [argument] = chrome.storage.sync.get.lastCall.args;
	assert.deepEqual(argument, 'name');
});

test('set(undefined) will unset the value', async () => {
	createStorage({
		name: 'Rico',
	});
	assert.equal(await testItem.set(), undefined);
	assert.equal(chrome.storage.local.set.lastCall, undefined);
	const [argument] = chrome.storage.local.remove.lastCall.args;
	assert.deepEqual(argument, 'name');
});

test('set() with value', async () => {
	await testItem.set('Anne');
	const [argument1] = chrome.storage.local.set.lastCall.args;
	assert.deepEqual(Object.keys(argument1), ['name']);
	assert.equal(argument1.name, 'Anne');

	await (0, testItem.set)('Rico');
	const [argument2] = chrome.storage.local.set.lastCall.args;
	assert.equal(argument2.name, 'Rico', 'get method should be bound');
});

test('remove()', async () => {
	await testItem.remove();
	const [argument] = chrome.storage.local.remove.lastCall.args;
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
	assert.equal(await (0, testItem.has)(), true, 'get method should be bound');
});

test('onChanged() is called for the correct item', async () => {
	const name = new StorageItem('name');
	const spy = vi.fn();
	name.onChanged(spy);
	chrome.storage.onChanged.trigger({unrelatedKey: 123}, 'local');
	expect(spy).not.toHaveBeenCalled();
	chrome.storage.onChanged.trigger({name: 'Anne'}, 'sync');
	expect(spy).not.toHaveBeenCalled();
	chrome.storage.onChanged.trigger({name: 'Anne'}, 'local');
	expect(spy).toHaveBeenCalled();
});
