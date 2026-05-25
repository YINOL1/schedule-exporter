function generateICS(rawInput) {
    // Converting Quest Date Time Format into .ics
    function formatDateTime(dateStr, timeStr) {
        const [year, month, day] = dateStr.split('/');

        let [time, modifier] = [timeStr.slice(0,-2), timeStr.slice(-2)];
        let [hour, minute] = time.split(':');
        
        if (hour === '12') {
            hour = modifier === 'PM' ? '12' : '00';
        }
        else if (modifier === 'PM') {
            hour = parseInt(hour, 10) + 12;
        }

        return `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}T${String(hour).padStart(2, '0')}${minute.padStart(2, '0')}00`;
    }
    const now = new Date();
    const dtStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const lines = rawInput.split('\n');

    // Initiate .ics Content
    let icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Quest Schedule Exporter//EN",
        "CALSCALE:GREGORIAN"
    ];

    let currentCourseTitle = "Unknown";
    let currentComponent = "";
    let currentTime = "";
    let currentRoom = "";
    let expectRoom = false;

    // Searching and Extracting Schedule Information
    lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        if (expectRoom) {
            currentRoom = trimmedLine;
            expectRoom = false;
            return;
        }

        if (/\d{4}\/\d{2}\/\d{2} - \d{4}\/\d{2}\/\d{2}/.test(trimmedLine)) {
            const dates = trimmedLine;
            if (currentTime.includes("TBA") || dates.includes("TBA")) return;

            //Insert Schedule in .ics File
            const timeParts = currentTime.split(' ');
            const daysString = timeParts[0]; 
            const timeRange = currentTime.replace(daysString, '').trim();
            const [startTimeStr, endTimeStr] = timeRange.split(' - ');
            const [startDateStr, endDateStr] = dates.split(' - ');

            let rruleDays = daysString
                .replace(/Th/g, "th,")
                .replace(/T/g, "tu,")
                .replace(/W/g, "we,")
                .replace(/M/g, "mo,")
                .replace(/F/g, "fr,")
                .toUpperCase();

            if (rruleDays.endsWith(",")) {
                rruleDays = rruleDays.slice(0, -1);
            }

            const dtStart = formatDateTime(startDateStr, startTimeStr);
            const dtEnd = formatDateTime(startDateStr, endTimeStr);

            const [eYear, eMonth, eDay] = endDateStr.split('/');
            const endObj = new Date(eYear, eMonth - 1, eDay);
            endObj.setDate(endObj.getDate() + 1);
            
            const safeYear = endObj.getFullYear();
            const safeMonth = String(endObj.getMonth() + 1).padStart(2, '0');
            const safeDay = String(endObj.getDate()).padStart(2, '0');
            const rruleUntil = `${safeYear}${safeMonth}${safeDay}T040000Z`;

            const safeTitle = currentCourseTitle.replace(/\s+/g, '');
            const randomString = Math.random().toString(36).substring(2, 10);
            const uid = `${dtStart}-${safeTitle}-${randomString}@questexporter.com`;

            const eventBlock = [
                "BEGIN:VEVENT",
                `UID:${uid}`,
                `DTSTAMP:${dtStamp}`,
                `SUMMARY:${currentCourseTitle} (${currentComponent})`,
                `LOCATION:${currentRoom}`,
                `DTSTART;TZID=America/Toronto:${dtStart}`,
                `DTEND;TZID=America/Toronto:${dtEnd}`,
                `RRULE:FREQ=WEEKLY;UNTIL=${rruleUntil};BYDAY=${rruleDays}`,
                "END:VEVENT"
            ].join('\r\n');

            icsContent.push(eventBlock);
        }
        else if (trimmedLine.includes(' - ') && !trimmedLine.includes(':') && !trimmedLine.includes('AM') && !trimmedLine.includes('PM')) {
            currentCourseTitle = trimmedLine.split(' - ')[0].trim();
        }
        else if (["LEC", "TUT", "LAB", "TST", "SEM"].includes(trimmedLine)) {
            currentComponent = trimmedLine;
        }
        else if ((trimmedLine.includes('AM') || trimmedLine.includes('PM')) && trimmedLine.includes(':')) {
            currentTime = trimmedLine;
            expectRoom = true;
        }
    });

    icsContent.push("END:VCALENDAR");

    return icsContent.join('\r\n');
}