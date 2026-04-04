import {vi} from 'vitest';
import {chrome} from 'jest-chrome';

// Jest-chrome uses jest.fn() lazily; provide the vitest equivalent
globalThis.jest = vi;
globalThis.chrome = chrome;
