(async () => {
  const CSV_URL = "https://raw.githubusercontent.com/LANCER1254/calendar-dataset/main/calendar_events.csv";

  // かんたんCSVパーサ（今回の形式: date,title,location,notes 前提）
  function parseCSV(text){
    const lines = text.trim().split(/\r?\n/);
    const header = lines.shift().split(",");
    const idx = {
      date: header.indexOf("date"),
      title: header.indexOf("title"),
      location: header.indexOf("location"),
      notes: header.indexOf("notes"),
    };
    return lines.map(l=>{
      const c = l.split(",");
      return {
        date: (c[idx.date]||"").trim(),
        title: (c[idx.title]||"").trim(),
        location: (c[idx.location]||"").trim(),
        notes: (c[idx.notes]||"").trim(),
      };
    }).filter(r=>r.date);
  }

  function mapByDate(rows){
    const m={};
    for(const r of rows){
      (m[r.date] ||= []).push(r);
    }
    return m;
  }

  // 表示中の年月を推定（なければ現在月）
  function getVisibleYearMonth(){
    const m = document.querySelector('input[type="month"]')?.value;
    if (m && /^\d{4}-\d{2}$/.test(m)) {
      const [y, mo] = m.split("-").map(Number);
      return { y, m: mo };
    }
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth()+1 };
  }

  function stampYMDToCells(){
    const { y, m } = getVisibleYearMonth();
    const first = new Date(y, m-1, 1);
    const startWd = first.getDay(); // 日曜=0
    const cells = Array.from(document.querySelectorAll(".grid .cell"));
    cells.forEach((cell, i) => {
      const d = new Date(y, m-1, 1 - startWd + i);
      const ymd = d.toISOString().slice(0,10);
      cell.dataset.ymd = ymd;
      // 日付表示が無ければ補完
      if (!cell.querySelector(".date")) {
        const s = document.createElement("div");
        s.className = "date";
        Object.assign(s.style, {position:"absolute", top:"6px", right:"8px", fontSize:"12px", color:"var(--muted)"});
        s.textContent = d.getDate();
        cell.style.position = "relative";
        cell.appendChild(s);
      }
    });
  }

  function render(byDate){
    const cells = document.querySelectorAll(".grid .cell");
    cells.forEach(cell=>{
      cell.querySelectorAll(".event").forEach(x=>x.remove());
      const ymd = cell.dataset.ymd;
      const items = byDate[ymd] || [];
      for(const ev of items){
        const div = document.createElement("div");
        div.className = "event";
        Object.assign(div.style, {
          marginTop:"22px", fontSize:"12px", padding:"6px 8px",
          borderRadius:"8px", border:"1px solid var(--grid)", background:"#0f1530"
        });
        const meta = [ev.location, ev.notes].filter(Boolean).join(" / ");
        div.textContent = ev.title + (meta ? " — " + meta : "");
        cell.appendChild(div);
      }
    });
    const empty = document.querySelector(".empty");
    if (empty) empty.style.display = ""; // ここでは特に触らない
  }

  try{
    const res = await fetch(CSV_URL + "?t=" + Date.now());
    const text = await res.text();
    const rows = parseCSV(text);
    stampYMDToCells();
    render(mapByDate(rows));
  }catch(e){
    console.error("grid-fill.js error:", e);
  }
})();
