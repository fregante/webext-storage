import {vi} from 'vitest';
import {chrome} from 'jest-chrome';

/* eslint-disable unicorn/no-global-object-property-assignment -- Test setup */

// Jest-chrome uses jest.fn() lazily; provide the vitest equivalent
globalThis.jest = vi;
globalThis.chrome = chrome;
/* eslint-enable unicorn/no-global-object-property-assignment */
