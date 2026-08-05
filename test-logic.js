const path = "/quiz/9th-grade/science/chemical-reactions";
const prefixes = ["/quiz/", "/summary/", "/notes/", "/homework/", "/tutor/"];
for (const prefix of prefixes) {
  if (path.startsWith(prefix)) {
    const segments = path.substring(prefix.length).split('/').filter(Boolean);
    console.log("segments:", segments);
    if (segments.length === 1) {
      console.log("id:", segments[0]);
    } else if (segments.length > 1) {
      const prefixName = prefix.substring(1, prefix.length - 1);
      const slug = `${prefixName}_${segments.join("_")}`;
      console.log("slug:", slug);
    }
  }
}
