var datestyle = false;
var yDate, tDate, bDate, fDate;
var hideLabels = false;
var preferDates = false;
var perpetual = false;
var preferLog = false;
var extraButtons = false;
var fwdInterval, bwdInterval;
var thisDate;
let observer = undefined;

export default {
    onload: ({ extensionAPI }) => {
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
                    description: "Number of days to jump forward",
                    action: {
                        type: "input", placeholder: "Days as integer",
                        onChange: (evt) => { setFwdInterval(evt); } // update div onchange
                    },
                },
                {
                    id: "ytt-bwdInterval",
                    name: "Interval to jump backward",
                    description: "Number of days to jump backward",
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
            label: "Jump to next interval",
            callback: () => gotoFwdInt()
        });
        extensionAPI.ui.commandPalette.addCommand({
            label: "Jump to last interval",
            callback: () => gotoBackInt()
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
        extensionAPI.ui.commandPalette.addCommand({
            label: "Jump to next interval (Sidebar)",
            callback: () => gotoFwdInt(false, true)
        });
        extensionAPI.ui.commandPalette.addCommand({
            label: "Jump to last interval (Sidebar)",
            callback: () => gotoBackInt(false, true)
        });

        async function initiateObserver() {
            const targetNode1 = document.getElementsByClassName("rm-topbar")[0];
            const config = { attributes: false, childList: true, subtree: true };
            const callback = function (mutationsList, observer) {
                for (const mutation of mutationsList) {
                    if (mutation.addedNodes[0]) {
                        for (var i = 0; i < mutation.addedNodes[0]?.classList.length; i++) {
                            if (mutation.addedNodes[0]?.classList[i] == "rm-open-left-sidebar-btn") { // left sidebar has been closed
                                createDiv();
                            }
                        }
                    } else if (mutation.removedNodes[0]) {
                        for (var i = 0; i < mutation.removedNodes[0]?.classList.length; i++) {
                            if (mutation.removedNodes[0]?.classList[i] == "rm-open-left-sidebar-btn") { // left sidebar has been opened
                                createDiv();
                            }
                        }
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
        if (extensionAPI.settings.get("ytt-fwdInterval") != null && extensionAPI.settings.get("ytt-fwdInterval") != "") {
            if (isStringInteger(extensionAPI.settings.get("ytt-fwdInterval"))) {
                fwdInterval = extensionAPI.settings.get("ytt-fwdInterval");
            } else {
                alert("Please make sure you only enter integers in the settings for Jump to next interval")
            }
        }
        if (extensionAPI.settings.get("ytt-bwdInterval") != null && extensionAPI.settings.get("ytt-bwdInterval") != "") {
            if (isStringInteger(extensionAPI.settings.get("ytt-bwdInterval"))) {
                bwdInterval = extensionAPI.settings.get("ytt-bwdInterval");
            } else {
                alert("Please make sure you only enter integers in the settings for Jump to last interval")
            }
        }

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
            createDiv();
        };
        async function setFwdInterval(evt) {
            if (evt.target.value != null && evt.target.value != "") {
                if (isStringInteger(evt.target.value)) {
                    fwdInterval = evt.target.value;
                    createDiv();
                } else {
                    alert("Please make sure you only enter integers in the settings for Jump to next interval")
                }
            }
        };
        async function setBwdInterval(evt) {
            if (evt.target.value != null && evt.target.value != "") {
                if (isStringInteger(evt.target.value)) {
                    bwdInterval = evt.target.value;
                    createDiv();
                } else {
                    alert("Please make sure you only enter integers in the settings for Jump to next interval")
                }
            }
        };
    },
    onunload: () => {
        if (document.getElementById("todayTomorrow")) {
            document.getElementById("todayTomorrow").remove();
        }
        observer.disconnect();
    }
}

async function createDiv() {
    var bMonth, bDay, bYear, fMonth, fDay, fYear, tMonth, tDay, tYear, yMonth, yDay, yYear;

    if (document.getElementById("todayTomorrow")) {
        document.getElementById("todayTomorrow").remove();
    }
    var startBlock = await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
    if (!startBlock) {
        var uri = window.location.href;
        const regex = /^https:\/\/roamresearch\.com\/(.+)?#\/(app|offline)\/.+$/gm; //today's DNP
        if (regex.test(uri)) { // this is Daily Notes for today
            var today = new Date();
            var dd = String(today.getDate()).padStart(2, '0');
            var mm = String(today.getMonth() + 1).padStart(2, '0');
            var yyyy = today.getFullYear();
            thisDate = new Date(yyyy, mm, dd);
        }
    } else {
        let q = `[:find (pull ?page [:node/title :block/string :block/uid {:block/children ...} ]) :where [?page :block/uid "${startBlock}"]  ]`;
        var info = await window.roamAlphaAPI.q(q);
        const regex = /\d{2}-\d{2}-\d{4}/;
        if (regex.test(info[0][0].uid)) { // dated DNP
            let dateBits = info[0][0].uid.split("-");
            let mm = String(parseInt(dateBits[0]) - 1);
            thisDate = new Date(dateBits[2], mm, dateBits[1]);
        } else { // not a dated DNP
            thisDate = new Date();
        }
    }

    // Clone the original date for each calculation
    const originalDate = new Date(thisDate.getTime());

    if (preferDates == true && perpetual == true) {
        if (extraButtons) {
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

        if (extraButtons) {
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
            if (extraButtons && perpetual) {
                bDate = bMonth.padStart(2, "0") + "/" + bDay.padStart(2, "0") + "/" + bYear;
                fDate = fMonth.padStart(2, "0") + "/" + fDay.padStart(2, "0") + "/" + fYear;
            }
        } else {
            yDate = yDay.padStart(2, "0") + "/" + yMonth.padStart(2, "0") + "/" + yYear;
            tDate = tDay.padStart(2, "0") + "/" + tMonth.padStart(2, "0") + "/" + tYear;
            if (extraButtons && perpetual) {
                bDate = bDay.padStart(2, "0") + "/" + bMonth.padStart(2, "0") + "/" + bYear;
                fDate = fDay.padStart(2, "0") + "/" + fMonth.padStart(2, "0") + "/" + fYear;
            }
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

        if (extraButtons) {
            const backDate = new Date(originalDate.getTime());
            const bwd = Number(bwdInterval);
            backDate.setDate(backDate.getDate() - bwd);
            bMonth = (backDate.getMonth() + 1).toString();
            bDay = backDate.getDate().toString();
            bYear = backDate.getFullYear().toString();

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
            if (extraButtons) {
                bDate = bMonth.padStart(2, "0") + "/" + bDay.padStart(2, "0") + "/" + bYear;
                fDate = fMonth.padStart(2, "0") + "/" + fDay.padStart(2, "0") + "/" + fYear;
            }
        } else {
            yDate = yDay.padStart(2, "0") + "/" + yMonth.padStart(2, "0") + "/" + yYear;
            tDate = tDay.padStart(2, "0") + "/" + tMonth.padStart(2, "0") + "/" + tYear;
            if (extraButtons) {
                bDate = bDay.padStart(2, "0") + "/" + bMonth.padStart(2, "0") + "/" + bYear;
                fDate = fDay.padStart(2, "0") + "/" + fMonth.padStart(2, "0") + "/" + fYear;
            }
        }
    }

    var divParent = document.createElement('div'); // parentDIV
    divParent.classList.add('.flex-container');
    divParent.innerHTML = "";
    divParent.id = 'todayTomorrow';

    if (extraButtons) {
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

    if (extraButtons) {
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

    if (document.querySelector(".rm-open-left-sidebar-btn")) {
        await sleep(20);
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
        await sleep(20);
        if (document.querySelector("span.bp3-button.bp3-minimal.bp3-icon-arrow-right.pointer.bp3-small.rm-electron-nav-forward-btn")) {
            let electronArrows = document.getElementsByClassName("rm-electron-nav-forward-btn")[0];
            electronArrows.after(divParent);
        } else {
            var topBarContent = document.querySelector("#app > div > div > div.flex-h-box > div.roam-main > div.rm-files-dropzone > div");
            var topBarRow = topBarContent.childNodes[1];
            topBarRow.parentNode.insertBefore(divParent, topBarRow);
        }
    }
}

// gotoDate functions
function formatDate(date) {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
}

async function resolveCurrentDate(offsetDays = 0) {
    let date;

    if (perpetual) {
        const startBlock = await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();

        if (!startBlock) {
            const uri = window.location.href;
            const isTodayDNP = /^https:\/\/roamresearch.com\/.+\/(app|offline)\/\w+$/.test(uri) || uri.endsWith("/search");
            if (isTodayDNP) {
                date = new Date();
            }
        } else {
            const q = `[:find (pull ?page [:node/title :block/string :block/uid {:block/children ...}]) :where [?page :block/uid "${startBlock}"]]`;
            const info = await window.roamAlphaAPI.q(q);
            const pageInfo = info?.[0]?.[0];

            if (pageInfo) {
                const uid = pageInfo.uid;
                if (/\d{2}-\d{2}-\d{4}/.test(uid)) {
                    const [mm, dd, yyyy] = uid.split("-").map(Number);
                    date = new Date(yyyy, mm - 1, dd);
                } else {
                    date = await window.roamAlphaAPI.util.pageTitleToDate(pageInfo.title.toString()) || new Date();
                }
            }
        }
    }

    if (!date) date = new Date();

    date.setDate(date.getDate() + offsetDays);
    return date;
}

async function navigateToDate(date, shiftKey) {
    const dateString = formatDate(date);
    const titleDate = convertToRoamDate(dateString);
    let page = await window.roamAlphaAPI.q(`[:find (pull ?e [:block/uid]) :where [?e :node/title "${titleDate}"]]`)?.[0]?.[0]?.uid;

    if (!page) {
        await window.roamAlphaAPI.createPage({ page: { title: titleDate, uid: dateString } });
        page = dateString;
    }

    const results = await window.roamAlphaAPI.data.pull("[:block/children]", [":block/uid", page]);
    if (!results) {
        const newBlockUid = roamAlphaAPI.util.generateUID();
        await window.roamAlphaAPI.createBlock({
            location: { "parent-uid": page, order: 0 },
            block: { string: "", uid: newBlockUid }
        });
    }

    goToDate(page, shiftKey);
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
    await gotoRelativeDate(e, sidebar, -Number(bwdInterval));
}

async function gotoFwdInt(e, sidebar) {
    await gotoRelativeDate(e, sidebar, Number(fwdInterval));
}

async function gotoLog() {
    await window.roamAlphaAPI.ui.mainWindow.openDailyNotes();
}


// helper functions
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function convertToRoamDate(dateString) {
    var parsedDate = dateString.split('-');
    var year = parsedDate[2];
    var month = Number(parsedDate[0]);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var monthName = months[month - 1];
    var day = Number(parsedDate[1]);
    let suffix = (day >= 4 && day <= 20) || (day >= 24 && day <= 30)
        ? "th"
        : ["st", "nd", "rd"][day % 10 - 1];
    return "" + monthName + " " + day + suffix + ", " + year + "";
}

function isStringInteger(value) {
    const number = Number(value);
    return !isNaN(number) && Number.isInteger(number);
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