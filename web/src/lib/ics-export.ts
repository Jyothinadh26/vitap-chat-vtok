// 1-Click Google Calendar .ics generator

export interface CalendarEvent {
  title: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endDate?: string;
  endTime?: string;
  location?: string;
}

export function generateICS(events: CalendarEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VIT-AP VTOP Assistant//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  events.forEach((ev, i) => {
    const startClean = ev.startDate.replace(/-/g, "");
    const timeClean = ev.startTime ? ev.startTime.replace(/:/g, "") + "00" : "090000";
    const dtStart = `${startClean}T${timeClean}`;

    const endClean = ev.endDate ? ev.endDate.replace(/-/g, "") : startClean;
    const endTimeClean = ev.endTime ? ev.endTime.replace(/:/g, "") + "00" : "100000";
    const dtEnd = `${endClean}T${endTimeClean}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:vtop-${Date.now()}-${i}@vitap.ac.in`,
      `DTSTAMP:${startClean}T000000Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:${ev.description.replace(/\n/g, "\\n")}`,
      ev.location ? `LOCATION:${ev.location}` : "LOCATION:VIT-AP Campus",
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICSFile(filename: string, events: CalendarEvent[]): void {
  const icsData = generateICS(events);
  const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename.endsWith(".ics") ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
