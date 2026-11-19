var datestyle = false;
var yDate, tDate, bDate, fDate;
var hideLabels = false;
var preferDates = false;
var perpetual = false;
var preferLog = false;
var extraButtons = false;
var fwdInterval, bwdInterval;
let observer = undefined;
let observerTimer = null;
let renderRevision = 0;
let active = false;
const pendingDailyPages = new Map(); // page uid -> in-flight ensureDailyPage promise

export default {
    onload: ({ extensionAPI }) => {
        active = true;
        const config = {
            tabTitle: "Yesterday & Tomorrow",
            settings: [
                {
                    id: "ytt-labels",
                    name: "Hide text labels",
                    description: "Display icons only, without labels",
                    action: {
                        type: "switch",
                        onChange: (evt) => { hideLabels = evt.target.checked; createDiv(); } // update div onchange
                    },
                },
                {
                    id: "ytt-dates",
                    name: "Prefer dates",
                    description: "Instead of Yesterday and Tomorrow, display as dates",
                    action: {
                        type: "switch",
                        onChange: (evt) => { preferDates = evt.target.checked; createDiv(); } // update div onchange
                    },
                },
                {
                    id: "ytt-datesStyle",
                    name: "Display US dates",
                    description: "Display labels as MM/DD/YYYY instead of DD/MM/YYYY",
                    action: {
                        type: "switch",
                        onChange: (evt) => { datestyle = evt.target.checked; createDiv(); } // update div onchange
                    },
                },
                {
                    id: "ytt-perpetual",
                    name: "Perpetual Mode",
                    description: "Yesterday and Tomorrow buttons step back or forward one day on each press",
                    action: {
                        type: "switch",
                        onChange: (evt) => { perpetual = evt.target.checked; createDiv(); } // update div onchange
                    },
                },
                {
                    id: "ytt-preferLog",
                    name: "Prefer Log page",
                    description: "Today button navigates to log page not today's date",
                    action: {
                        type: "switch",
                        onChange: (evt) => { preferLog = evt.target.checked; createDiv(); } // update div onchange
                    },
                },
                {
                    id: "ytt-extraButtons",
                    name: "Add configurable skip-to buttons",
                    description: "Add extra buttons to navigate to user-configurable intervals",
                    action: {
                        type: "switch",
                        onChange: (evt) => { setConfig(evt); }
                    },
                }
            ]
        };
        const config1 = {
            tabTitle: "Yesterday & Tomorrow",
            settings: [
                {
                    id: "ytt-labels",
                    name: "Hide text labels",
                    description: "Display icons only, without labels",
                    action: {
                        type: "switch",
                        onChange: (evt) => { hideLabels = evt.target.checked; createDiv(); } // update div onchange
                    },
                },
                {
                    id: "ytt-dates",
                    name: "Prefer dates",
                    description: "Instead of Yesterday and Tomorrow, display as dates",
                    action: {
                        type: "switch",
                        onChange: (evt) => { preferDates = evt.target.checked; createDiv(); } // update div onchange
                    },
                },
                {
                    id: "ytt-datesStyle",
                    name: "Display US dates",
                    description: "Display labels as MM/DD/YYYY instead of DD/MM/YYYY",
                    action: {
                        type: "switch",
                        onChange: (evt) => { datestyle = evt.target.checked; createDiv(); } // update div onchange
                    },
                },
                {
                    id: "ytt-perpetual",
                    name: "Perpetual Mode",
                    description: "Yesterday and Tomorrow buttons step back or forward one day on each press",
                    action: {
                        type: "switch",
                        onChange: (evt) => { perpetual = evt.target.checked; createDiv(); } // update div onchange
                    },
                },
                {
                    id: "ytt-preferLog",
                    name: "Prefer Log page",
                    description: "Today button navigates to log page not today's date",
                    action: {
                        type: "switch",
                        onChange: (evt) => { preferLog = evt.target.checked; createDiv(); } // update div onchange
                    },
                },
                {
                    id: "ytt-extraButtons",
                    name: "Add configurable skip-to buttons",
                    description: "Add extra buttons to navigate to user-configurable intervals",
                    action: {
                        type: "switch",
                        onChange: (evt) => { setConfig(evt); }
                    },
                },
                {
                    id: "ytt-fwdInterval",
                    name: "Interval to jump forward",
                    description: "Whole number of days to jump forward, e.g. 7. The button stays hidden until a valid number is entered.",
                    action: {
                        type: "input", placeholder: "Days as integer",
                        onChange: (evt) => { setFwdInterval(evt); } // update div onchange
                    },
                },
                {
                    id: "ytt-bwdInterval",
                    name: "Interval to jump backward",
                    description: "Whole number of days to jump backward, e.g. 7. The button stays hidden until a valid number is entered.",
                    action: {
                        type: "input", placeholder: "Days as integer",
                        onChange: (evt) => { setBwdInterval(evt); } // update div onchange
                    },
                }
            ]
        };
        extensionAPI.ui.commandPalette.addCommand({
            label: "Go to Previous Day",
            callback: () => gotoYesterday()
        });
        extensionAPI.ui.commandPalette.addCommand({
            label: "Go to Today",
            callback: () => gotoToday()
        });
        extensionAPI.ui.commandPalette.addCommand({
            label: "Go to Next Day",
            callback: () => gotoTomorrow()
        });
        extensionAPI.ui.commandPalette.addCommand({
            label: "Go to Previous Day (Sidebar)",
            callback: () => gotoYesterday(false, true)
        });
        extensionAPI.ui.commandPalette.addCommand({
            label: "Go to Today (Sidebar)",
            callback: () => gotoToday(false, true)
        });
        extensionAPI.ui.commandPalette.addCommand({
            label: "Go to Next Day (Sidebar)",
            callback: () => gotoTomorrow(false, true)
        });
        // Interval commands exist only while the skip-to buttons are enabled.
        // extensionAPI cleans them up on unload; removeCommand is only needed for the runtime toggle.
        const intervalCommands = [
            { label: "Jump to next interval", callback: () => gotoFwdInt() },
            { label: "Jump to last interval", callback: () => gotoBackInt() },
            { label: "Jump to next interval (Sidebar)", callback: () => gotoFwdInt(false, true) },
            { label: "Jump to last interval (Sidebar)", callback: () => gotoBackInt(false, true) },
        ];
        let intervalCommandsRegistered = false;
        function syncIntervalCommands(enabled) {
            if (enabled === intervalCommandsRegistered) return;
            for (const command of intervalCommands) {
                try {
                    if (enabled) {
                        extensionAPI.ui.commandPalette.addCommand(command);
                    } else {
                        extensionAPI.ui.commandPalette.removeCommand({ label: command.label });
                    }
                } catch (e) {
                    console.warn("Yesterday & Tomorrow: failed to update command", command.label, e);
                }
            }
            intervalCommandsRegistered = enabled;
        }

        function initiateObserver() {
            // Never stack observers if onload runs again without an onunload.
            if (observer) {
                observer.disconnect();
                observer = undefined;
            }
            const targetNode1 = document.querySelector(".rm-topbar");
            if (!targetNode1) return;
            const config = { attributes: false, childList: true, subtree: true };
            const isSidebarButton = (node) => node?.nodeType === 1 && node.classList.contains("rm-open-left-sidebar-btn");
            const callback = function (mutationsList) {
                for (const mutation of mutationsList) {
                    // left sidebar closed (button added) or opened (button removed)
                    if (isSidebarButton(mutation.addedNodes[0]) || isSidebarButton(mutation.removedNodes[0])) {
                        scheduleCreateDiv();
                        return;
                    }
                }
            };
            observer = new MutationObserver(callback);
            observer.observe(targetNode1, config);
        }
        initiateObserver();

        // onload
        if (extensionAPI.settings.get("ytt-extraButtons") == true) {
            extensionAPI.settings.panel.create(config1);
            extraButtons = true;
        } else {
            extensionAPI.settings.panel.create(config);
            extraButtons = false;
        }
        syncIntervalCommands(extraButtons);

        if (extensionAPI.settings.get("ytt-dates") == true) {
            preferDates = true;
            if (extensionAPI.settings.get("ytt-datesStyle") == true) {
                datestyle = true;
            }
        } else {
            preferDates = false;
        }
        if (extensionAPI.settings.get("ytt-labels") == true) {
            hideLabels = true;
        }
        if (extensionAPI.settings.get("ytt-perpetual") == true) {
            perpetual = true;
        }
        if (extensionAPI.settings.get("ytt-preferLog") == true) {
            preferLog = true;
        }
        fwdInterval = normaliseInterval(extensionAPI.settings.get("ytt-fwdInterval"), "Jump forward");
        bwdInterval = normaliseInterval(extensionAPI.settings.get("ytt-bwdInterval"), "Jump back");

        // Perpetual-mode labels depend on the open page, so refresh them when Roam navigates
        // by any route (links, back/forward), not just via this extension's buttons.
        window.removeEventListener("hashchange", onRouteChange);
        window.removeEventListener("popstate", onRouteChange);
        window.addEventListener("hashchange", onRouteChange);
        window.addEventListener("popstate", onRouteChange);

        createDiv(); //onload

        // onChange - advanced settings panel
        async function setConfig(evt) {
            if (evt.target.checked == true) {
                extensionAPI.settings.panel.create(config1);
                extraButtons = true;
            } else {
                extensionAPI.settings.panel.create(config);
                extraButtons = false;
            }
            syncIntervalCommands(extraButtons);
            createDiv();
        };
        // Invalid or partial input (e.g. "-" while typing "-5") hides the button until the
        // value is a whole number, matching what a reload of the stored value would show.
        async function setFwdInterval(evt) {
            fwdInterval = normaliseInterval(evt?.target?.value ?? evt, "Jump forward");
            createDiv();
        };
        async function setBwdInterval(evt) {
            bwdInterval = normaliseInterval(evt?.target?.value ?? evt, "Jump back");
            createDiv();
        };
    },
    onunload: () => {
        active = false;
        renderRevision++;
        clearTimeout(observerTimer);
        observerTimer = null;
        window.removeEventListener("hashchange", onRouteChange);
        window.removeEventListener("popstate", onRouteChange);
        document.querySelectorAll('[id="todayTomorrow"]').forEach(element => element.remove());
        observer?.disconnect();
        observer = undefined;
    }
}

async function createDiv() {
    if (!active) return;
    const revision = ++renderRevision;
    var bMonth, bDay, bYear, fMonth, fDay, fYear, tMonth, tDay, tYear, yMonth, yDay, yYear;

    const thisDate = await resolveCurrentDate(0);
    if (!active || revision !== renderRevision) return;

    // Clone the original date for each calculation
    const originalDate = new Date(thisDate.getTime());

    // A skip-to button is only shown when its interval is a valid integer;
    // otherwise its date maths would produce NaN labels and invalid navigation.
    const showBwd = extraButtons && parseInterval(bwdInterval) !== null;
    const showFwd = extraButtons && parseInterval(fwdInterval) !== null;

    if (preferDates == true && perpetual == true) {
        if (showBwd) {
            const backDate = new Date(originalDate.getTime());
            const bwd = Number(bwdInterval);
            backDate.setDate(backDate.getDate() - bwd);
            bMonth = (backDate.getMonth() + 1).toString();
            bDay = backDate.getDate().toString();
            bYear = backDate.getFullYear().toString();
        }

        // Calculate yesterday
        const yesterday = new Date(originalDate.getTime());
        yesterday.setDate(yesterday.getDate() - 1);
        yMonth = (yesterday.getMonth() + 1).toString();
        yDay = yesterday.getDate().toString();
        yYear = yesterday.getFullYear().toString();

        // Calculate tomorrow
        const tomorrow = new Date(originalDate.getTime());
        tomorrow.setDate(tomorrow.getDate() + 1);
        tMonth = (tomorrow.getMonth() + 1).toString();
        tDay = tomorrow.getDate().toString();
        tYear = tomorrow.getFullYear().toString();

        if (showFwd) {
            const fwdDate = new Date(originalDate.getTime());
            const fwd = Number(fwdInterval);
            fwdDate.setDate(fwdDate.getDate() + fwd);
            fMonth = (fwdDate.getMonth() + 1).toString();
            fDay = fwdDate.getDate().toString();
            fYear = fwdDate.getFullYear().toString();
        }

        if (datestyle == true) {
            yDate = yMonth.padStart(2, "0") + "/" + yDay.padStart(2, "0") + "/" + yYear;
            tDate = tMonth.padStart(2, "0") + "/" + tDay.padStart(2, "0") + "/" + tYear;
            if (showBwd) bDate = bMonth.padStart(2, "0") + "/" + bDay.padStart(2, "0") + "/" + bYear;
            if (showFwd) fDate = fMonth.padStart(2, "0") + "/" + fDay.padStart(2, "0") + "/" + fYear;
        } else {
            yDate = yDay.padStart(2, "0") + "/" + yMonth.padStart(2, "0") + "/" + yYear;
            tDate = tDay.padStart(2, "0") + "/" + tMonth.padStart(2, "0") + "/" + tYear;
            if (showBwd) bDate = bDay.padStart(2, "0") + "/" + bMonth.padStart(2, "0") + "/" + bYear;
            if (showFwd) fDate = fDay.padStart(2, "0") + "/" + fMonth.padStart(2, "0") + "/" + fYear;
        }
    } else if (preferDates == true && perpetual == false) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yMonth = (yesterday.getMonth() + 1).toString();
        yDay = yesterday.getDate().toString();
        yYear = yesterday.getFullYear().toString();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tMonth = (tomorrow.getMonth() + 1).toString();
        tDay = tomorrow.getDate().toString();
        tYear = tomorrow.getFullYear().toString();

        if (showBwd) {
            const backDate = new Date(originalDate.getTime());
            const bwd = Number(bwdInterval);
            backDate.setDate(backDate.getDate() - bwd);
            bMonth = (backDate.getMonth() + 1).toString();
            bDay = backDate.getDate().toString();
            bYear = backDate.getFullYear().toString();
        }
        if (showFwd) {
            const fwdDate = new Date(originalDate.getTime());
            const fwd = Number(fwdInterval);
            fwdDate.setDate(fwdDate.getDate() + fwd);
            fMonth = (fwdDate.getMonth() + 1).toString();
            fDay = fwdDate.getDate().toString();
            fYear = fwdDate.getFullYear().toString();
        }
        if (datestyle == true) {
            yDate = yMonth.padStart(2, "0") + "/" + yDay.padStart(2, "0") + "/" + yYear;
            tDate = tMonth.padStart(2, "0") + "/" + tDay.padStart(2, "0") + "/" + tYear;
            if (showBwd) bDate = bMonth.padStart(2, "0") + "/" + bDay.padStart(2, "0") + "/" + bYear;
            if (showFwd) fDate = fMonth.padStart(2, "0") + "/" + fDay.padStart(2, "0") + "/" + fYear;
        } else {
            yDate = yDay.padStart(2, "0") + "/" + yMonth.padStart(2, "0") + "/" + yYear;
            tDate = tDay.padStart(2, "0") + "/" + tMonth.padStart(2, "0") + "/" + tYear;
            if (showBwd) bDate = bDay.padStart(2, "0") + "/" + bMonth.padStart(2, "0") + "/" + bYear;
            if (showFwd) fDate = fDay.padStart(2, "0") + "/" + fMonth.padStart(2, "0") + "/" + fYear;
        }
    }

    var divParent = document.createElement('div'); // parentDIV
    divParent.classList.add('.flex-container');
    divParent.innerHTML = "";
    divParent.id = 'todayTomorrow';

    if (showBwd) {
        var div = document.createElement('div'); // bwd interval
        div.classList.add('flex-items');
        div.innerHTML = "";
        div.id = 'bwdDiv';
        div.onclick = gotoBackInt;
        var span = document.createElement('span');
        span.classList.add('bp3-button', 'bp3-minimal', 'bp3-small', 'bp3-icon-double-chevron-left');
        div.prepend(span);
        if (hideLabels == false) {
            var span3 = document.createElement('span');
            span3.classList.add('yt-hide');
            if (preferDates == true) {
                span3.innerHTML = "" + bDate;
            } else if (perpetual == true) {
                span3.innerHTML = "-" + bwdInterval;
            } else {
                span3.innerHTML = "Jump Back";
            }
            div.append(span3);
        }
        divParent.append(div);
    }

    var div = document.createElement('div'); // yesterday
    div.classList.add('flex-items');
    div.innerHTML = "";
    div.id = 'yestDiv';
    div.onclick = gotoYesterday;
    var span = document.createElement('span');
    span.classList.add('bp3-button', 'bp3-minimal', 'bp3-small', 'bp3-icon-chevron-left');
    div.prepend(span);
    if (hideLabels == false) {
        var span3 = document.createElement('span');
        span3.classList.add('yt-hide');
        if (preferDates == true) {
            span3.innerHTML = "" + yDate;
        } else if (perpetual == true) {
            span3.innerHTML = "-1";
        } else {
            span3.innerHTML = "Yesterday";
        }
        div.append(span3);
    }
    divParent.append(div);

    var divCenter = document.createElement('div'); // today
    divCenter.classList.add('flex-items');
    divCenter.innerHTML = "";
    divCenter.id = 'todayDiv';
    if (preferLog) {
        divCenter.onclick = gotoLog;
    } else {
        divCenter.onclick = gotoToday;
    }
    var spanCenter = document.createElement('span');
    spanCenter.classList.add('bp3-button', 'bp3-minimal', 'bp3-small', 'bp3-icon-timeline-events');
    spanCenter.innerHTML = "";
    divCenter.prepend(spanCenter);

    if (hideLabels == false) {
        var spanCenter1 = document.createElement('span');
        spanCenter1.classList.add('yt-hide');
        spanCenter1.innerHTML = "Today";
        divCenter.append(spanCenter1);
    }
    divParent.append(divCenter);

    var div1 = document.createElement('div'); // tomorrow
    div1.classList.add('flex-items');
    div1.innerHTML = "";
    div1.id = 'tomDiv';
    div1.onclick = gotoTomorrow;
    var span1 = document.createElement('span');
    span1.classList.add('bp3-button', 'bp3-minimal', 'bp3-small', 'bp3-icon-chevron-right');
    div1.append(span1);
    if (hideLabels == false) {
        var span2 = document.createElement('span');
        span2.classList.add('yt-hide');
        if (preferDates == true) {
            span2.innerHTML = "" + tDate;
        } else if (perpetual == true) {
            span2.innerHTML = "+1";
        } else {
            span2.innerHTML = "Tomorrow";
        }
        div1.append(span2);
    }
    divParent.append(div1);

    if (showFwd) {
        var div1 = document.createElement('div'); // fwdInterval
        div1.classList.add('flex-items');
        div1.innerHTML = "";
        div1.id = 'fwdDiv';
        div1.onclick = gotoFwdInt;
        var span1 = document.createElement('span');
        span1.classList.add('bp3-button', 'bp3-minimal', 'bp3-small', 'bp3-icon-double-chevron-right');
        div1.append(span1);
        if (hideLabels == false) {
            var span2 = document.createElement('span');
            span2.classList.add('yt-hide');
            if (preferDates == true) {
                span2.innerHTML = "" + fDate;
            } else if (perpetual == true) {
                span2.innerHTML = "+" + fwdInterval;
            } else {
                span2.innerHTML = "Jump Forward";
            }
            div1.append(span2);
        }
        divParent.append(div1);
    }

    await sleep(20);
    // Only the newest render may replace the toolbar; removal and insertion
    // must stay synchronous so overlapping refreshes cannot leave duplicates.
    if (!active || revision !== renderRevision) return;
    document.querySelectorAll('[id="todayTomorrow"]').forEach(element => element.remove());

    if (document.querySelector(".rm-open-left-sidebar-btn")) {
        if (document.querySelector("#workspaces")) { // Workspaces extension also installed, so place this to right
            let workspaces = document.querySelector("#workspaces");
            workspaces.parentNode.insertBefore(divParent, workspaces);
        } else if (document.querySelector("span.bp3-button.bp3-minimal.bp3-icon-arrow-right.pointer.bp3-small.rm-electron-nav-forward-btn")) {
            let electronArrows = document.getElementsByClassName("rm-electron-nav-forward-btn")[0];
            electronArrows.after(divParent);
        } else {
            let sidebarButton = document.querySelector(".rm-open-left-sidebar-btn");
            sidebarButton.after(divParent);
        }
    } else {
        if (document.querySelector("span.bp3-button.bp3-minimal.bp3-icon-arrow-right.pointer.bp3-small.rm-electron-nav-forward-btn")) {
            let electronArrows = document.getElementsByClassName("rm-electron-nav-forward-btn")[0];
            electronArrows.after(divParent);
        } else {
            var topBarContent = document.querySelector("#app > div > div > div.flex-h-box > div.roam-main > div.rm-files-dropzone > div");
            var topBarRow = topBarContent?.childNodes[1];
            if (topBarRow?.parentNode) {
                topBarRow.parentNode.insertBefore(divParent, topBarRow);
            } else {
                // Roam's layout has changed; fall back to the start of the top bar rather than throwing.
                document.querySelector(".rm-topbar")?.prepend(divParent);
            }
        }
    }
}

// gotoDate functions
async function resolveCurrentDate(offsetDays = 0) {
    let date;

    if (perpetual) {
        const startBlock = await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();

        if (!startBlock) {
            // getOpenPageOrBlockUid() returns null on the daily notes log view.
            // Read today's DNP UID from the topmost log page in the DOM —
            // avoids URL-shape regex and stays aligned with what Roam is showing.
            // Other null-startBlock views (e.g. /search) fall through to today
            // via the safety net below.
            const logPageUid = document
                .querySelector(".roam-log-page .rm-title-display-container[data-page-uid]")
                ?.getAttribute("data-page-uid");
            const m = logPageUid?.match(/^(\d{2})-(\d{2})-(\d{4})$/);
            if (m) {
                date = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
            }
        } else {
            // startBlock is the UID. If it parses as a DNP UID, use it directly.
            // Otherwise pull the title for the pageTitleToDate fallback (handles
            // pages with non-canonical UIDs). Block UIDs have no :node/title and
            // cleanly fall through to today.
            const m = startBlock.match(/^(\d{2})-(\d{2})-(\d{4})$/);
            if (m) {
                date = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
            } else {
                const pulled = window.roamAlphaAPI.data.pull(
                    "[:node/title]",
                    [":block/uid", startBlock]
                );
                const title = pulled?.[":node/title"];
                date = (title && await window.roamAlphaAPI.util.pageTitleToDate(title)) || new Date();
            }
        }
    }

    if (!date) date = new Date();

    date.setDate(date.getDate() + offsetDays);
    return date;
}

async function navigateToDate(date, shiftKey) {
    const dateString = window.roamAlphaAPI.util.dateToPageUid(date);
    // Rapid repeat clicks on the same date share one create, so the page and its
    // first empty block are never created twice.
    let pending = pendingDailyPages.get(dateString);
    if (!pending) {
        pending = ensureDailyPage(date, dateString).finally(() => pendingDailyPages.delete(dateString));
        pendingDailyPages.set(dateString, pending);
    }
    const page = await pending;
    goToDate(page, shiftKey);
}

async function ensureDailyPage(date, dateString) {
    const titleDate = window.roamAlphaAPI.util.dateToPageTitle(date);
    const findPage = async () =>
        (await window.roamAlphaAPI.q(`[:find (pull ?e [:block/uid]) :where [?e :node/title "${titleDate}"]]`))?.[0]?.[0]?.uid;
    let page = await findPage();

    if (!page) {
        try {
            await window.roamAlphaAPI.createPage({ page: { title: titleDate, uid: dateString } });
            page = dateString;
        } catch (e) {
            // Created elsewhere in the meantime (another tab or device): use the existing page.
            page = await findPage();
            if (!page) throw e;
        }
    }

    const results = await window.roamAlphaAPI.data.pull("[:block/children]", [":block/uid", page]);
    if (!results) {
        const newBlockUid = roamAlphaAPI.util.generateUID();
        await window.roamAlphaAPI.createBlock({
            location: { "parent-uid": page, order: 0 },
            block: { string: "", uid: newBlockUid }
        });
    }
    return page;
}

async function gotoRelativeDate(e, sidebar, offsetDays) {
    const shiftKey = await getShiftKey(e, sidebar);
    const date = await resolveCurrentDate(offsetDays);
    await navigateToDate(date, shiftKey);
}

async function gotoYesterday(e, sidebar) {
    await gotoRelativeDate(e, sidebar, -1);
}

async function gotoToday(e, sidebar) {
    const shiftKey = await getShiftKey(e, sidebar);
    const today = new Date();
    await navigateToDate(today, shiftKey);
}

async function gotoTomorrow(e, sidebar) {
    await gotoRelativeDate(e, sidebar, 1);
}

async function gotoBackInt(e, sidebar) {
    const days = parseInterval(bwdInterval);
    if (!extraButtons || days === null) return;
    await gotoRelativeDate(e, sidebar, -days);
}

async function gotoFwdInt(e, sidebar) {
    const days = parseInterval(fwdInterval);
    if (!extraButtons || days === null) return;
    await gotoRelativeDate(e, sidebar, days);
}

async function gotoLog() {
    await window.roamAlphaAPI.ui.mainWindow.openDailyNotes();
}


// helper functions
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Returns the interval as an integer, or null unless it is a plain whole number
// ("7", "-3"). Rejects forms Number() would accept, such as "1e3", "0x10" or "7.0".
function parseInterval(value) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    if (!/^-?\d+$/.test(text)) return null;
    const number = Number(text);
    return Number.isSafeInteger(number) ? number : null;
}

// Canonical string form for labels ("07" -> "7"), or undefined when invalid/unset.
function normaliseInterval(value, label) {
    const number = parseInterval(value);
    if (number === null) {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            console.warn(`Yesterday & Tomorrow: ignoring "${label}" interval "${value}" - enter a whole number of days.`);
        }
        return undefined;
    }
    return String(number);
}

function onRouteChange() {
    if (perpetual) scheduleCreateDiv();
}

// Debounced refresh for observer-driven re-renders (sidebar toggles).
function scheduleCreateDiv() {
    clearTimeout(observerTimer);
    observerTimer = setTimeout(() => {
        observerTimer = null;
        createDiv();
    }, 150);
}

async function goToDate(date, shiftButton) {
    if (shiftButton) {
        window.roamAlphaAPI.ui.rightSidebar.addWindow({ window: { type: 'outline', 'block-uid': date } });
    } else {
        await window.roamAlphaAPI.ui.mainWindow.openBlock({ block: { uid: date } });
        createDiv();
    }
}

async function getShiftKey(e, sidebar) {
    return sidebar || (e && e.shiftKey);
}