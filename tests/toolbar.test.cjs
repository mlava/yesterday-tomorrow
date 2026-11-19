// Run: npm install --no-save --ignore-scripts jsdom@26.1.0
//      node --test tests/toolbar.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { setTimeout: wait } = require('node:timers/promises');
const { JSDOM } = require('jsdom');

const source = readFileSync(process.env.EXTENSION_SOURCE || resolve(__dirname, '../extension.js'), 'utf8');

function fixture({ desktop = true, collapsed = true, workspaces = false, getUid, realTimers = false } = {}) {
    const dom = new JSDOM(`<div id="app"><div><div><div class="flex-h-box">
      <div class="roam-main"><div class="rm-files-dropzone"><div><div></div><div class="rm-topbar">
      ${collapsed ? '<span class="rm-open-left-sidebar-btn"></span>' : ''}
      ${desktop ? '<span class="bp3-button bp3-minimal bp3-icon-arrow-right pointer bp3-small rm-electron-nav-forward-btn"></span>' : ''}
      ${workspaces ? '<div id="workspaces"></div>' : ''}
      </div></div></div></div></div></div></div></div>`, { runScripts: 'outside-only' });
    const { window } = dom;
    const timers = [];
    if (!realTimers) window.setTimeout = callback => timers.push(callback);
    window.roamAlphaAPI = {
        ui: { mainWindow: { getOpenPageOrBlockUid: getUid || (() => '11-12-2026') } },
    };
    let panel;
    const settings = { 'ytt-extraButtons': true, 'ytt-fwdInterval': '7', 'ytt-bwdInterval': '7',
        'ytt-perpetual': true, 'ytt-dates': true };
    window.eval(source.replace('export default {', 'window.testExtension = {'));
    window.testExtension.onload({ extensionAPI: {
        settings: { get: key => settings[key], panel: { create: value => { panel = value; } } },
        ui: { commandPalette: { addCommand() {} } },
    } });
    return {
        window,
        count: () => window.document.querySelectorAll('[id="todayTomorrow"]').length,
        change: checked => panel.settings.find(s => s.id === 'ytt-labels').action.onChange({ target: { checked } }),
        unload: () => window.testExtension.onunload(),
        async settle() {
            if (realTimers) return wait(80);
            // Drain the actual extension's promise continuations and its 20 ms timers.
            for (let i = 0; i < 30; i++) {
                await Promise.resolve();
                for (const callback of timers.splice(0)) callback();
            }
        },
        close: () => window.close(),
    };
}

test('sequential updates keep exactly one five-button toolbar (control)', async () => {
    const f = fixture();
    try {
        await f.settle();
        for (const checked of [true, false, true]) {
            f.change(checked);
            await f.settle();
            assert.equal(f.count(), 1);
            assert.equal(f.window.document.querySelector('#todayTomorrow').children.length, 5);
        }
    } finally { f.close(); }
});

for (const options of [
    { desktop: true, collapsed: true },
    { desktop: true, collapsed: false },
    { desktop: false, collapsed: true },
    { desktop: false, collapsed: false },
    { desktop: false, collapsed: true, workspaces: true },
]) {
    test(`overlapping updates keep one toolbar: ${JSON.stringify(options)}`, async () => {
        const f = fixture(options);
        try {
            await f.settle();
            f.change(true);
            f.change(false);
            await f.settle();
            assert.equal(f.count(), 1);
            assert.equal(f.window.document.querySelectorAll('#todayTomorrow .yt-hide').length, 5);
        } finally { f.close(); }
    });
}

test('real sidebar mutation observer does not duplicate a pending render', async () => {
    const f = fixture();
    try {
        await f.settle();
        f.change(true);
        f.window.document.querySelector('.rm-open-left-sidebar-btn').remove();
        await f.settle();
        assert.equal(f.count(), 1);
    } finally { f.close(); }
});

test('overlapping sidebar refresh also keeps one toolbar with real timers', async () => {
    const f = fixture({ realTimers: true });
    try {
        await f.settle();
        f.change(true);
        f.window.document.querySelector('.rm-open-left-sidebar-btn').remove();
        await f.settle();
        assert.equal(f.count(), 1);
    } finally { f.close(); }
});

test('a later refresh removes all pre-existing duplicate toolbars', async () => {
    const f = fixture();
    try {
        await f.settle();
        const toolbar = f.window.document.querySelector('#todayTomorrow');
        toolbar.after(toolbar.cloneNode(true), toolbar.cloneNode(true));
        f.change(true);
        await f.settle();
        assert.equal(f.count(), 1);
    } finally { f.close(); }
});

test('unload cancels pending rendering and removes all existing copies', async () => {
    const f = fixture();
    try {
        await f.settle();
        f.change(true);
        const copy = f.window.document.createElement('div');
        copy.id = 'todayTomorrow';
        f.window.document.querySelector('.rm-topbar').append(copy, copy.cloneNode());
        f.unload();
        await f.settle();
        assert.equal(f.count(), 0);
    } finally { f.close(); }
});

test('out-of-order date reads cannot replace the latest toolbar', async () => {
    const pending = [];
    const f = fixture({ getUid: () => new Promise(resolve => pending.push(resolve)) });
    try {
        pending.shift()('11-12-2026');
        await f.settle();
        f.change(false);
        f.change(false);
        const older = pending.shift();
        pending.shift()('11-14-2026');
        await f.settle();
        older('11-12-2026');
        await f.settle();
        assert.equal(f.count(), 1);
        assert.equal(f.window.document.querySelector('#yestDiv .yt-hide').textContent, '13/11/2026');
    } finally { f.close(); }
});
