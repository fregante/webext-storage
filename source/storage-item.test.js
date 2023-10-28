/* eslint-disable n/file-extension-in-import -- No alternative until this file is changed to .test.ts */
import {test, beforeEach, assert, expect, vi} from 'vitest';
import {StorageItem} from './storage-item.ts';

const testItem = new StorageItem('name');

function createStorage(wholeCache) {
	for (const [key, data] of Object.entries(wholeCache)) {
		chrome.storage.local.get
			.withArgs(key)
			.yields({[key]: data});
	}
}

beforeEach(() => {
	chrome.flush();
	chrome.storage.local.get.yields({});
	chrome.storage.local.set.yields(undefined);
	chrome.storage.local.remove.yields(undefined);
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

test('set() without a value matches the standard behavior (no change made)', async () => {
	createStorage({
		name: 'Rico',
	});
	assert.equal(await testItem.set(), undefined);
	const arguments_ = chrome.storage.local.set.lastCall.args[0];
	assert.deepEqual(Object.keys(arguments_), ['name']);
	assert.equal(arguments_.name, undefined);
});

test('set() with value', async () => {
	await testItem.set('Anne');
	const arguments_ = chrome.storage.local.set.lastCall.args[0];
	assert.deepEqual(Object.keys(arguments_), ['name']);
	assert.equal(arguments_.name, 'Anne');
});

test('onChange() is called for the correct item', async () => {
	const name = new StorageItem('name');
	const spy = vi.fn();
	name.onChange(spy);
	chrome.storage.onChanged.trigger({unrelatedKey: 123}, 'local');
	expect(spy).not.toHaveBeenCalled();
	chrome.storage.onChanged.trigger({name: 'Anne'}, 'sync');
	expect(spy).not.toHaveBeenCalled();
	chrome.storage.onChanged.trigger({name: 'Anne'}, 'local');
	expect(spy).toHaveBeenCalled();
});
