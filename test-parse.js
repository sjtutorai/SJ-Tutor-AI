const path = "/quiz/9th-grade/science/chemical-reactions";
const prefixes = ["/quiz/", "/summary/", "/notes/", "/homework/", "/tutor/"];
for (const prefix of prefixes) {
  if (path.startsWith(prefix)) {
    const segments = path.substring(prefix.length).split('/').filter(Boolean);
    console.log("segments:", segments);
    if (segments.length === 1) {
      console.log("ID:", segments[0]);
    } else if (segments.length > 1) {
      const customId = `${prefix.substring(1)}${segments.join('_')}`;
      console.log("customId:", customId);
    }
  }
}
