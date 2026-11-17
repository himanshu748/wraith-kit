import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',testMatch:'**/*.pw.ts',fullyParallel:false,workers:1,timeout:30000,use:{browserName:'chromium',viewport:{width:1440,height:1000},trace:'off'},reporter:'list'});
