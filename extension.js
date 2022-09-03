var datestyle = false;
var yDate, tDate;
var hideLabels = false;
var preferDates = false

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
            ]
        };

        extensionAPI.settings.panel.create(config);
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

        createDiv(); //onload
    },
    onunload: () => {
        if (document.getElementById("todayTomorrow")) {
            document.getElementById("todayTomorrow").remove();
        }
    }
}

function createDiv() {
    if (document.getElementById("todayTomorrow")) {
        document.getElementById("todayTomorrow").remove();
    }

    if (preferDates == true) {
        let yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
        var yMonth = (yesterday.getMonth() + 1).toString();
        var yDay = yesterday.getDate().toString();
        var yYear = yesterday.getFullYear().toString();
        let tomorrow = new Date(new Date().setDate(new Date().getDate() + 1));
        var tMonth = (tomorrow.getMonth() + 1).toString();
        var tDay = tomorrow.getDate().toString();
        var tYear = tomorrow.getFullYear().toString();

        if (datestyle == true) {
            yDate = yMonth.padStart(2, "0") + "/" + yDay.padStart(2, "0") + "/" + yYear;
            tDate = tMonth.padStart(2, "0") + "/" + tDay.padStart(2, "0") + "/" + tYear;
        } else {
            yDate = yDay.padStart(2, "0") + "/" + yMonth.padStart(2, "0") + "/" + yYear;
            tDate = tDay.padStart(2, "0") + "/" + tMonth.padStart(2, "0") + "/" + tYear;
        }
    }

    var divParent = document.createElement('div'); // parentDIV
    divParent.classList.add('.flex-container');
    divParent.innerHTML = "";
    divParent.id = 'todayTomorrow';

    var div = document.createElement('div'); // yesterday
    div.classList.add('flex-items');
    div.innerHTML = "";
    div.id = 'yestDiv';
    div.onclick = gotoYesterday;
    var span = document.createElement('span');
    span.classList.add('bp3-button', 'bp3-minimal', 'bp3-small', 'bp3-icon-direction-left');
    div.prepend(span);
    if (hideLabels == false) {
        var span3 = document.createElement('span');
        span3.classList.add('yt-hide');
        if (preferDates == true) {
            span3.innerHTML = "" + yDate;
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
    divCenter.onclick = gotoToday;
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
    span1.classList.add('bp3-button', 'bp3-minimal', 'bp3-small', 'bp3-icon-direction-right');
    div1.append(span1);
    if (hideLabels == false) {
        var span2 = document.createElement('span');
        span2.classList.add('yt-hide');
        if (preferDates == true) {
            span2.innerHTML = "" + tDate;
        } else {
            span2.innerHTML = "Tomorrow";
        }
        div1.append(span2);
    }
    divParent.append(div1);

    var topBarContent = document.querySelector("#app > div > div > div.flex-h-box > div.roam-main > div.rm-files-dropzone > div");
    var topBarRow = topBarContent.childNodes[1];

    if (topBarContent && topBarRow) {
        topBarRow.parentNode.insertBefore(divParent, topBarRow);
    }

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

function goToDate(date, shiftButton) {
    if (shiftButton) {
        window.roamAlphaAPI.ui.rightSidebar.addWindow({ window: { type: 'outline', 'block-uid': date } })
    } else {
        window.roamAlphaAPI.ui.mainWindow.openBlock({ block: { uid: date } })
    }
}

function gotoToday(e) {
    var shiftButton = false;
    if (e.shiftKey) {
        shiftButton = true;
    }
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();
    today = mm + '-' + dd + '-' + yyyy;
    goToDate(today, shiftButton);
}

async function gotoYesterday(e) {
    var shiftButton = false;
    if (e.shiftKey) {
        shiftButton = true;
    }
    var date = new Date();
    date.setDate(date.getDate() - 1);
    var currentMonth = (date.getMonth() + 1).toString();
    var currentDay = date.getDate().toString();
    var currentYear = date.getFullYear().toString();
    var currentDate = currentMonth.padStart(2, "0") + "-" + currentDay.padStart(2, "0") + "-" + currentYear;
    var titleDate = convertToRoamDate(currentDate);
    await window.roamAlphaAPI.createPage({ page: { title: titleDate, uid: currentDate } });
    var results = window.roamAlphaAPI.data.pull("[:block/children]", [":block/uid", currentDate]);
    if (results == null) {
        let newBlockUid = roamAlphaAPI.util.generateUID();
        await window.roamAlphaAPI.createBlock({ location: { "parent-uid": currentDate, order: 0 }, block: { string: "", uid: newBlockUid } });
    }
    goToDate(currentDate, shiftButton);
}

async function gotoTomorrow(e) {
    var shiftButton = false;
    if (e.shiftKey) {
        shiftButton = true;
    }
    var date = new Date();
    date.setDate(date.getDate() + 1);
    var currentMonth = (date.getMonth() + 1).toString();
    var currentDay = date.getDate().toString();
    var currentYear = date.getFullYear().toString();
    var currentDate = currentMonth.padStart(2, "0") + "-" + currentDay.padStart(2, "0") + "-" + currentYear;
    var titleDate = convertToRoamDate(currentDate);
    await window.roamAlphaAPI.createPage({ page: { title: titleDate, uid: currentDate } });
    var results = window.roamAlphaAPI.data.pull("[:block/children]", [":block/uid", currentDate]);
    if (results == null) {
        let newBlockUid = roamAlphaAPI.util.generateUID();
        await window.roamAlphaAPI.createBlock({ location: { "parent-uid": currentDate, order: 0 }, block: { string: "", uid: newBlockUid } });
    }
    goToDate(currentDate, shiftButton);
}