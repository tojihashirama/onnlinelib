
    let F = { old: null, new: null, zip: null };
    let scriptText = ""; // final text to process (may come from inside a ZIP)
    let scriptFileName = ""; // name of the script file being used
    let resultText = "";
    let logItems = [];
    let activeFilter = "all";
    let stats = { updated: 0, try: 0, failed: 0, skipped: 0 };
    let safeColor = true;
    let safeStrict = false;
    let zipEntries = []; // list of files found inside a ZIP
    let selectedZipEntry = null; // the entry the user picked
    
    function setSafeColor(v) { safeColor = v; }
    
    function setSafeStrict(v) { safeStrict = v; }
    

    function toast(msg) {
      const t = document.getElementById("toast");
      t.textContent = msg;
      t.classList.add("show");
      clearTimeout(t._t);
      t._t = setTimeout(() => t.classList.remove("show"), 2800);
    }
    
    
    ["old", "new"].forEach(key => {
      const slot = document.getElementById("slot-" + key);
      const input = document.getElementById("input-" + key);
      const lbl = document.getElementById("lbl-" + key);
      const nm = document.getElementById("name-" + key);
      const sz = document.getElementById("size-" + key);
      slot.onclick = () => input.click();
      input.onchange = () => loadDump(input.files[0]);
      slot.ondragover = e => { e.preventDefault();
        slot.classList.add("drag-over"); };
      slot.ondragleave = () => slot.classList.remove("drag-over");
      slot.ondrop = e => { e.preventDefault();
        slot.classList.remove("drag-over");
        loadDump(e.dataTransfer.files[0]); };
      
      function loadDump(f) {
        if (!f) return;
        F[key] = f;
        if (lbl) lbl.style.display = "none";
        nm.style.display = "block";
        nm.textContent = f.name;
        sz.textContent = (f.size / 1024).toFixed(2) + " KB";
        slot.classList.add("loaded");
        toast("LOADED: " + f.name);
      }
    });
    
   
    (function() {
      const slot = document.getElementById("slot-zip");
      const input = document.getElementById("input-zip");
      slot.onclick = () => input.click();
      input.onchange = () => handleScriptFile(input.files[0]);
      slot.ondragover = e => { e.preventDefault();
        slot.classList.add("drag-over"); };
      slot.ondragleave = () => slot.classList.remove("drag-over");
      slot.ondrop = e => { e.preventDefault();
        slot.classList.remove("drag-over");
        handleScriptFile(e.dataTransfer.files[0]); };
    })();
    
    function getFileExt(name) {
      return (name.split('.').pop() || '').toLowerCase();
    }
    
    async function handleScriptFile(f) {
      if (!f) return;
      const ext = getFileExt(f.name);
      const zipBadge = document.getElementById("zip-badge");
      const zipPanel = document.getElementById("zipPanel");
      
      // Reset ZIP panel state
      selectedZipEntry = null;
      zipEntries = [];
      zipPanel.classList.remove("show");
      document.getElementById("zipUseBtn").disabled = true;
      
      document.getElementById("lbl-zip").style.display = "none";
      document.getElementById("name-zip").style.display = "block";
      document.getElementById("name-zip").textContent = f.name;
      document.getElementById("size-zip").textContent = (f.size / 1024).toFixed(2) + " KB";
      document.getElementById("slot-zip").classList.add("loaded");
      
      if (ext === "zip") {
        
        zipBadge.style.display = "flex";
        F.zip = null; 
        scriptText = "";
        scriptFileName = "";
        toast("ZIP detected — extracting files...");
        await extractZip(f);
      } else {
       
        zipBadge.style.display = "none";
        F.zip = f;
        scriptFileName = f.name;
        scriptText = await readText(f);
        
        const baseName = f.name.replace(/\.[^.]+$/, "");
        document.getElementById("filenameInput").value = baseName;
        toast("LOADED: " + f.name);
      }
    }
    
    async function extractZip(f) {
      const zipPanel = document.getElementById("zipPanel");
      const zipFileList = document.getElementById("zipFileList");
      const zipFileCount = document.getElementById("zipFileCount");
      zipPanel.classList.add("show");
      zipFileList.innerHTML = '<div class="zip-empty">Extracting...</div>';
      
      try {
        const arrayBuffer = await f.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const supported = ["lua", "cpp", "txt", "cs"];
        const files = [];
        
        zip.forEach((relativePath, zipEntry) => {
          if (zipEntry.dir) return;
          const ext = getFileExt(zipEntry.name);
          if (supported.includes(ext)) {
            files.push({ path: relativePath, name: zipEntry.name.split("/").pop(), ext, size: null, entry: zipEntry });
          }
        });
        
        zipEntries = files;
        zipFileCount.textContent = files.length + " file" + (files.length !== 1 ? "s" : "");
        
        if (files.length === 0) {
          zipFileList.innerHTML = '<div class="zip-empty">No .lua / .cpp / .txt / .cs files found in this ZIP.</div>';
          return;
        }
        
        // ender file list
        zipFileList.innerHTML = "";
        files.forEach((file, idx) => {
          const extCls = ["lua", "cpp", "txt"].includes(file.ext) ? file.ext : "other";
          const item = document.createElement("div");
          item.className = "zip-file-item";
          item.innerHTML = `
            <span class="zfi-ext ${extCls}">.${file.ext.toUpperCase()}</span>
            <div class="zfi-info">
              <div class="zfi-name">${escHtml(file.name)}</div>
              <div class="zfi-path">${escHtml(file.path)}</div>
            </div>
            <div class="zfi-check"><svg viewBox="0 0 14 14" fill="none"><polyline points="2,7 6,11 12,3"/></svg></div>`;
          item.onclick = () => selectZipEntry(idx);
          zipFileList.appendChild(item);
        });
        
        // Auto-select if only 1 file
        if (files.length === 1) {
          selectZipEntry(0);
        }
        
        toast("ZIP extracted — " + files.length + " file(s) found");
      } catch (e) {
        zipFileList.innerHTML = '<div class="zip-empty" style="color:var(--danger)">Failed to read ZIP: ' + escHtml(String(e)) + '</div>';
        toast("ERROR: Could not read ZIP");
      }
    }
    
    function selectZipEntry(idx) {
      const items = document.querySelectorAll(".zip-file-item");
      items.forEach((el, i) => el.classList.toggle("selected", i === idx));
      selectedZipEntry = zipEntries[idx];
      document.getElementById("zipUseBtn").disabled = false;
    }
    
    async function useSelectedZipFile() {
      if (!selectedZipEntry) return;
      const btn = document.getElementById("zipUseBtn");
      btn.disabled = true;
      btn.textContent = "LOADING...";
      try {
        const text = await selectedZipEntry.entry.async("string");
        scriptText = text;
        scriptFileName = selectedZipEntry.name;
        F.zip = { name: selectedZipEntry.name, size: text.length };
        
      
        const baseName = selectedZipEntry.name.replace(/\.[^.]+$/, "");
        document.getElementById("filenameInput").value = baseName;
        
        // Update slot display
        document.getElementById("name-zip").textContent = selectedZipEntry.name + " (from ZIP)";
        document.getElementById("size-zip").textContent = (text.length / 1024).toFixed(2) + " KB";
        
        toast("USING: " + selectedZipEntry.name);
      } catch (e) {
        toast("ERROR: Could not read file from ZIP");
      }
      btn.disabled = false;
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><polyline points="2,7 6,11 12,3"/></svg> USE SELECTED FILE`;
    }
    
   
    function readText(file) {
      return new Promise(res => { const r = new FileReader();
        r.onload = () => res(r.result);
        r.readAsText(file); });
    }
    
    function normHex(h) { return "0x" + h.replace(/^0x/i, "").toUpperCase(); }
    
    function tick() { return new Promise(r => setTimeout(r, 0)); }
    
    function escHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    
    
    const COLOR_CONTEXT_RE = /\b(colou?r|rgba?|argb|paint|brush|fill|stroke|tint|palette|hex|background|foreground)\b/i;
    
    function isColorByte(b) { const v = parseInt(b, 16); const hi = (v >> 4) & 0xF,
        lo = v & 0xF; return hi === lo || v === 0 || v === 255 || v === 128; }
    
    function isColorHex(hexStr, lineCtx) {
      if (COLOR_CONTEXT_RE.test(lineCtx)) return true;
      const digits = hexStr.replace(/^0x/i, "");
      const len = digits.length;
      if (len === 8) {
        const pairs = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6), digits.slice(6, 8)];
        if (pairs.filter(p => isColorByte(p)).length >= 3) return true;
      }
      return false;
    }
    
  
    const MODIFIERS = new Set(["public", "private", "protected", "internal", "static", "virtual", "override", "abstract", "sealed", "readonly", "const", "new", "extern", "async", "unsafe", "partial", "volatile", "fixed"]);
    
    function normalizeParams(pStr) {
      if (!pStr || !pStr.trim()) return "";
      return pStr.split(",").map(p => {
        const parts = p.trim().split(/\s+/).filter(w => !["ref", "out", "in", "params"].includes(w.toLowerCase()));
        return (parts[0] || "").toLowerCase();
      }).filter(Boolean).join(",");
    }
    
    function extractSigs(ln) {
      let clean = ln.replace(/\{[^}]*\}/g, "").replace(/;$/, "").replace(/\/\/.*$/, "").trim();
      if (!clean) return null;
      // Support .ctor / .cctor — \.?\w+ matches leading dot
      const mMatch = clean.match(/(\.?\w+)\s*\(([^)]*)\)/);
      if (mMatch) {
        const name = mMatch[1].toLowerCase();
        const params = normalizeParams(mMatch[2]);
        const simple = name + "(" + params + ")";
        const tokens = clean.split(/\s+/).filter(t => !MODIFIERS.has(t.toLowerCase()));
        const stripped = tokens.join(" ");
        const fMatch = stripped.match(/(\w+)\s+(\.?\w+)\s*\(([^)]*)\)/);
        const full = fMatch ? fMatch[1].toLowerCase() + "|" + fMatch[2].toLowerCase() + "(" + normalizeParams(fMatch[3]) + ")" : simple;
        return { simple, full };
      }
      const fMatch = clean.match(/(\.?\w+)\s*(?:;|\{|$)/);
      if (fMatch) { const name = fMatch[1].toLowerCase(); return { simple: name + "()", full: name + "()" }; }
      return null;
    }
    
    function extractClassName(ln) {
      const m = ln.match(/(?:class|struct|interface|enum)\s+(\w+)/);
      return m ? m[1].toLowerCase() : null;
    }
    
    const FIELD_INLINE_RE = /(\w+)\s*;\s*\/\/\s*(0x[0-9a-fA-F]+)\s*$/;
    
    function parseDump(text) {
      const lines = text.split(/\r?\n/);
      const rvaRe = /\/\/\s*(?:RVA:\s*0x[0-9a-fA-F]+\s+)?Offset:\s*(0x[0-9a-fA-F]+)/i;
      const FIELD_OFFSET_RE = /\/\/\s*0x[0-9a-fA-F]+\s*$/;
      const CLASS_RE = /(?:class|struct|interface|enum)\s+\w+/;
      const offsetMap = new Map(),
        simpleMap = new Map(),
        fullMap = new Map(),
        classedMap = new Map();
      const fieldOffsetMap = new Map(),
        fieldByClassAndName = new Map();
      let currentClass = "";
      for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        if (CLASS_RE.test(rawLine) && !rawLine.trim().startsWith("//")) {
          const cn = extractClassName(rawLine.trim());
          if (cn) currentClass = cn;
        }
        // Field offsets (e.g. `private int hp; // 0x10`)
        if (!rawLine.trim().startsWith("//") && rawLine.includes(";") && rawLine.includes("// 0x")) {
          const fm = rawLine.match(FIELD_INLINE_RE);
          if (fm) {
            const fieldName = fm[1].toLowerCase();
            const offset = normHex(fm[2]);
            const entry = { type: "field", fieldName, className: currentClass, offset };
            if (!fieldOffsetMap.has(offset)) fieldOffsetMap.set(offset, []);
            fieldOffsetMap.get(offset).push(entry);
            const key = currentClass + "::" + fieldName;
            if (!fieldByClassAndName.has(key)) fieldByClassAndName.set(key, entry);
          }
        }
        // Method RVA offsets
        const m = rawLine.match(rvaRe);
        if (!m) continue;
        const offset = normHex(m[1]);
        if (offsetMap.has(offset)) continue;
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          const ln = lines[j].trim();
          if (!ln || ln.startsWith("//") || ln.startsWith("[") || ln === "{" || ln === "}") continue;
          if (!ln.includes("(") && FIELD_OFFSET_RE.test(ln)) continue;
          if (!ln.includes("(") && ln.includes("{")) continue;
          const sigs = extractSigs(ln);
          if (!sigs) continue;
          const classedKey = currentClass + "::" + sigs.full;
          const classedSimpleKey = currentClass + "::" + sigs.simple;
          const entry = { simple: sigs.simple, full: sigs.full, raw: ln, offset, className: currentClass, classedKey, classedSimpleKey };
          offsetMap.set(offset, entry);
          if (!classedMap.has(classedKey)) classedMap.set(classedKey, entry);
          if (!classedMap.has(classedSimpleKey)) classedMap.set(classedSimpleKey, entry);
          if (!simpleMap.has(sigs.simple)) simpleMap.set(sigs.simple, entry);
          if (!fullMap.has(sigs.full)) fullMap.set(sigs.full, entry);
          break;
        }
      }
      return { offsetMap, simpleMap, fullMap, classedMap, fieldOffsetMap, fieldByClassAndName };
    }
    
   
    function lookupNewOffset(oldEntry, newDump) {
      if (oldEntry.className) {
        const cfe = newDump.classedMap.get(oldEntry.classedKey);
        if (cfe) return { newOff: cfe.offset, newRaw: cfe.raw, method: "CLASS_FULL_SIG", isTry: false };
        const cse = newDump.classedMap.get(oldEntry.classedSimpleKey);
        if (cse) return { newOff: cse.offset, newRaw: cse.raw, method: "CLASS_SIMPLE_SIG", isTry: false };
        const nameOnly = oldEntry.simple.split("(")[0];
        const classNamePrefix = oldEntry.className + "::";
        for (const [sig, e] of newDump.classedMap.entries()) {
          if (sig.startsWith(classNamePrefix)) {
            const methodPart = sig.slice(classNamePrefix.length);
            if (methodPart.split("(")[0] === nameOnly) {
              return { newOff: e.offset, newRaw: e.raw, method: "CLASS_NAME_SCAN", isTry: true };
            }
          }
        }
      }
      const fe = newDump.fullMap.get(oldEntry.full);
      if (fe) return { newOff: fe.offset, newRaw: fe.raw, method: "FULL_SIG", isTry: false };
      const se = newDump.simpleMap.get(oldEntry.simple);
      if (se) return { newOff: se.offset, newRaw: se.raw, method: "SIMPLE_SIG", isTry: true };
      const baseName = oldEntry.simple.split("(")[0] + "()";
      const ne = newDump.simpleMap.get(baseName);
      if (ne) return { newOff: ne.offset, newRaw: ne.raw, method: "NAME_ONLY", isTry: true };
      const nameOnly2 = oldEntry.simple.split("(")[0];
      for (const [sig, e] of newDump.simpleMap.entries()) {
        if (sig.split("(")[0] === nameOnly2) return { newOff: e.offset, newRaw: e.raw, method: "NAME_SCAN", isTry: true };
      }
      return null;
    }
    
    
    function lookupFieldOffset(nh, oldDump, newDump) {
      const candidates = oldDump.fieldOffsetMap.get(nh);
      if (!candidates || candidates.length === 0) return null;
      const matches = [];
      for (const cand of candidates) {
        const key = cand.className + "::" + cand.fieldName;
        const newEntry = newDump.fieldByClassAndName.get(key);
        if (newEntry) matches.push({ newOff: newEntry.offset, sig: cand.fieldName, className: cand.className, method: "FIELD:" + cand.className + "::" + cand.fieldName });
      }
      if (matches.length === 0) return null;
      const allAgree = matches.every(r => r.newOff === matches[0].newOff);
      if (allAgree && matches.length === 1) return { ...matches[0], isTry: false, desc: matches[0].className + "::" + matches[0].sig };
      if (allAgree) return { ...matches[0], isTry: false, method: "FIELD_MULTI_AGREE(" + matches.length + ")", desc: matches[0].className + "::" + matches[0].sig };
      return { ...matches[0], isTry: true, method: "FIELD_AMBIGUOUS(" + matches.length + " classes)", desc: candidates.map(c => c.className + "::" + c.fieldName).join(", ") };
    }
    
  
    function setHeroStatus(msg) {
      document.getElementById("statusText").textContent = msg;
      const cap = document.getElementById("heroCaption");
      if (cap) cap.textContent = msg.toLowerCase();
    }

    function setTermLive(on, label) {
      const el = document.getElementById("termStatus");
      if (!el) return;
      el.classList.toggle("live", on);
      el.innerHTML = '<span class="pulse-dot"></span>' + (label || (on ? "RUNNING" : "IDLE"));
    }

    let lastNewDump = null;
    let offsetsTxtContent = "";

    function buildOffsetsTxt(newDump, scriptName) {
      const byClass = new Map();
      for (const entry of newDump.offsetMap.values()) {
        const cls = entry.className || "(global)";
        if (!byClass.has(cls)) byClass.set(cls, []);
        byClass.get(cls).push(entry);
      }
      const classNames = Array.from(byClass.keys()).sort((a, b) => a.localeCompare(b));
      const lines = [];
      lines.push("== METHOD OFFSETS ==");
      lines.push("Source: " + (scriptName || "new dump.cs"));
      lines.push("Classes: " + classNames.length + " | Methods: " + newDump.offsetMap.size);
      lines.push("");
      for (const cls of classNames) {
        const methods = byClass.get(cls).sort((a, b) => a.simple.localeCompare(b.simple));
        lines.push("[" + cls + "]");
        for (const m of methods) {
          lines.push("  " + m.offset + "  " + m.simple);
        }
        lines.push("");
      }
      if (newDump.fieldOffsetMap && newDump.fieldOffsetMap.size) {
        lines.push("== FIELD OFFSETS ==");
        const fieldByClass = new Map();
        for (const entries of newDump.fieldOffsetMap.values()) {
          for (const f of entries) {
            const cls = f.className || "(global)";
            if (!fieldByClass.has(cls)) fieldByClass.set(cls, []);
            fieldByClass.get(cls).push(f);
          }
        }
        const fClassNames = Array.from(fieldByClass.keys()).sort((a, b) => a.localeCompare(b));
        for (const cls of fClassNames) {
          const fields = fieldByClass.get(cls).sort((a, b) => a.fieldName.localeCompare(b.fieldName));
          lines.push("[" + cls + "]");
          for (const f of fields) {
            lines.push("  " + f.offset + "  " + f.fieldName);
          }
          lines.push("");
        }
      }
      return lines.join("\n");
    }

    function downloadOffsetsTxt() {
      if (!offsetsTxtContent) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([offsetsTxtContent], { type: "text/plain" }));
      a.download = "offset.txt";
      a.click();
      toast("DOWNLOADED: offset.txt");
    }

    async function run() {
      if (!F.old || !F.new) { toast("NEED OLD AND NEW DUMP.CS"); return; }
      if (!scriptText) { toast("LOAD A SCRIPT FILE (.lua/.cpp/.txt/.zip)"); return; }
      logItems = [];
      stats = { updated: 0, try: 0, failed: 0, skipped: 0 };
      resultText = "";
      const logBodyEl = document.getElementById("logBody");
      const empty = document.getElementById("logEmpty");
      Array.from(logBodyEl.querySelectorAll(".log-card")).forEach(el => el.remove());
      if (empty) { empty.style.display = "flex";
        empty.querySelector("span").innerHTML = "PROCESSING...<span class=\"cursor\"></span>"; }
      document.getElementById("bar").style.width = "0%";
      ["cntU", "cntT", "cntF", "cntS"].forEach(id => document.getElementById(id).textContent = "—");
      const runBtn = document.getElementById("runBtn"),
        dlBtn = document.getElementById("dlBtn"),
        scanHero = document.getElementById("scanHero");
      runBtn.disabled = true;
      runBtn.classList.add("running");
      document.getElementById("runLabel").textContent = "RUNNING...";
      dlBtn.disabled = true;
      dlBtn.classList.remove("ready");
      const dlOffsetsBtnInit = document.getElementById("dlOffsetsBtn");
      if (dlOffsetsBtnInit) { dlOffsetsBtnInit.disabled = true; dlOffsetsBtnInit.classList.remove("ready"); }
      scanHero.classList.add("active");
      setTermLive(true, "RUNNING");
      const start = performance.now();
      setHeroStatus("READING FILES...");
      const timer = setInterval(() => { document.getElementById("timeText").textContent = ((performance.now() - start) / 1000).toFixed(2) + "S"; }, 100);
      const [oldText, newText] = await Promise.all([readText(F.old), readText(F.new)]);
      setHeroStatus("BUILDING OFFSET MAPS...");
      await tick();
      const oldDump = parseDump(oldText),
        newDump = parseDump(newText);
      setHeroStatus("UPDATING OFFSETS...");
      await tick();
      const lines = scriptText.split(/\r?\n/),
        out = [];
      const hexRe = /0x[0-9a-fA-F]+/gi;
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const annotations = [],
          tokens = new Map();
        let m;
        hexRe.lastIndex = 0;
        while ((m = hexRe.exec(line)) !== null) { const nh = normHex(m[0]); if (!tokens.has(nh)) tokens.set(nh, m[0]); }
        for (const [nh, original] of tokens.entries()) {
          if (safeColor && isColorHex(nh, line)) {
            if (oldDump.offsetMap.has(nh)) {
              logItems.push({ type: "skipped", oldOff: nh, newOff: null, line: i + 1, sig: oldDump.offsetMap.get(nh).simple, method: "COLOR_SKIP", className: oldDump.offsetMap.get(nh).className });
              stats.skipped++;
            }
            continue;
          }
          const oldEntry = oldDump.offsetMap.get(nh);
          if (!oldEntry) {
            if (!safeStrict) {
              const fieldResult = lookupFieldOffset(nh, oldDump, newDump);
              if (fieldResult) {
                const { newOff, isTry, method, sig, className, desc } = fieldResult;
                if (newOff !== nh) {
                  const esc = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                  line = line.replace(new RegExp(esc, "gi"), newOff);
                  annotations.push((isTry ? "TRY" : "UPD") + ":" + nh + "->" + newOff + "|" + method);
                  logItems.push({ type: isTry ? "try" : "updated", oldOff: nh, newOff, line: i + 1, sig: sig || nh, desc: desc || "", newDesc: "", method, className: className || "" });
                  isTry ? stats.try++ : stats.updated++;
                }
              }
            }
            continue;
          }
          const result = lookupNewOffset(oldEntry, newDump);
          if (result && !result.isTry) {
            const { newOff, newRaw, method } = result;
            if (newOff !== nh) {
              const esc = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              line = line.replace(new RegExp(esc, "gi"), newOff);
              annotations.push("UPD:" + nh + "->" + newOff + "|" + oldEntry.simple + "|" + method);
              logItems.push({ type: "updated", oldOff: nh, newOff, line: i + 1, sig: oldEntry.simple, desc: oldEntry.raw, newDesc: newRaw, method, className: oldEntry.className });
              stats.updated++;
            }
          } else if (result && result.isTry) {
            const { newOff, newRaw, method } = result;
            const esc = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            line = line.replace(new RegExp(esc, "gi"), newOff);
            annotations.push("TRY:" + nh + "->" + newOff + "|VERIFY|" + method);
            logItems.push({ type: "try", oldOff: nh, newOff, line: i + 1, sig: oldEntry.simple, desc: oldEntry.raw, newDesc: newRaw, method, className: oldEntry.className });
            stats.try++;
          } else {
            annotations.push("FAIL:" + nh + "|" + oldEntry.simple);
            logItems.push({ type: "failed", oldOff: nh, newOff: null, line: i + 1, sig: oldEntry.simple, desc: oldEntry.raw, method: "NO_MATCH", className: oldEntry.className });
            stats.failed++;
          }
        }
        if (annotations.length) line += " -- [" + annotations.join(" | ") + " | L" + (i + 1) + "]";
        out.push(line);
        if (i % 50 === 0) { await tick();
          document.getElementById("bar").style.width = (i / lines.length * 100).toFixed(1) + "%"; }
      }
      clearInterval(timer);
      document.getElementById("bar").style.width = "100%";
      const total = stats.updated + stats.try+stats.failed;
      setHeroStatus("DONE — " + total + " OFFSETS PROCESSED");
      document.getElementById("cntU").textContent = stats.updated;
      document.getElementById("cntT").textContent = stats.try;
      document.getElementById("cntF").textContent = stats.failed;
      document.getElementById("cntS").textContent = stats.skipped;
      resultText = out.join("\n");
      lastNewDump = newDump;
      offsetsTxtContent = buildOffsetsTxt(newDump, F.new ? F.new.name : "");
      const dlOffsetsBtn = document.getElementById("dlOffsetsBtn");
      if (dlOffsetsBtn) { dlOffsetsBtn.disabled = false; dlOffsetsBtn.classList.add("ready"); }
      runBtn.disabled = false;
      runBtn.classList.remove("running");
      document.getElementById("runLabel").textContent = "RUN";
      dlBtn.disabled = false;
      dlBtn.classList.add("ready");
      setTermLive(false, "DONE");
      if (empty) empty.style.display = "none";
      renderLog();
      toast("DONE — " + stats.updated + " UPD / " + stats.try+" TRY / " + stats.failed + " FAIL / " + stats.skipped + " SKIP");
    }
    
    
    let currentModalItem = null;
    
    function openModal(item) {
      currentModalItem = item;
      const content = document.getElementById("detailContent");
      const labels = { updated: "UPDATED", try: "TRY — VERIFY", failed: "NOT FOUND", skipped: "SKIPPED" };
      const typeLabel = labels[item.type] || item.type.toUpperCase();
      const classHtml = item.className ? `<div class="modal-row"><div class="modal-row-label">Class</div><div class="modal-row-val warn">${escHtml(item.className)}</div></div>` : "";
      const sigHtml = item.sig ? `<div class="modal-row"><div class="modal-row-label">Signature / Field</div><div class="modal-row-val accent">${escHtml(item.sig)}</div></div>` : "";
      const descHtml = item.desc ? `<div class="modal-row"><div class="modal-row-label">Declaration (Old)</div><div class="modal-row-val" style="font-size:11px;color:var(--text2)">${escHtml(item.desc)}</div></div>` : "";
      const newDescHtml = item.newDesc ? `<div class="modal-row"><div class="modal-row-label">Declaration (New)</div><div class="modal-row-val" style="font-size:11px;color:var(--text2)">${escHtml(item.newDesc)}</div></div>` : "";
      const newOffHtml = item.newOff ? `<div><div class="modal-row-label" style="margin-bottom:3px">New Offset</div><div class="modal-row-val off-new">${escHtml(item.newOff)}</div></div>` : `<div><div class="modal-row-label" style="margin-bottom:3px">New Offset</div><div class="modal-row-val off-none">— NOT FOUND</div></div>`;
      content.innerHTML = `
        <div class="modal-badge ${item.type}"><span class="modal-badge-dot"></span>${typeLabel}</div>
        <div class="modal-offsets">
          <div><div class="modal-row-label" style="margin-bottom:3px">Old Offset</div><div class="modal-row-val off-old">${escHtml(item.oldOff)}</div></div>
          <div class="modal-arr">→</div>
          ${newOffHtml}
        </div>
        ${classHtml}${sigHtml}
        <div class="modal-row"><div class="modal-row-label">Match Method</div><div class="modal-row-val" style="color:var(--text2)">${escHtml(item.method||"—")}</div></div>
        <div class="modal-row"><div class="modal-row-label">Script Line</div><div class="modal-row-val" style="color:var(--text2)">Line ${item.line}</div></div>
        ${descHtml}${newDescHtml}
        <button class="modal-copy-btn" onclick="copyOffsetPair()">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3">
            <rect x="1" y="3" width="9" height="10" rx="1"/><path d="M4 3V2a1 1 0 011-1h7a1 1 0 011 1v9a1 1 0 01-1 1h-1"/>
          </svg>COPY NEW OFFSET
        </button>`;
      document.getElementById("detailModal").classList.add("open");
    }
    
    function closeModal(e) { if (e.target === document.getElementById("detailModal")) closeModalForce(); }
    
    function closeModalForce() { document.getElementById("detailModal").classList.remove("open");
      currentModalItem = null; }
    
    function copyOffsetPair() { if (!currentModalItem || !currentModalItem.newOff) return;
      navigator.clipboard.writeText(currentModalItem.newOff).then(() => toast("COPIED: " + currentModalItem.newOff)); }
    
   
    function buildLuaHeader() {
      const d = new Date();
      const pad = n => String(n).padStart(2, "0");
      const dateStr = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
      return [
        "-- offset updator",
        "--ver.6.0.0",
        "--@Sigmashan",
        "--date " + dateStr,
        ""
      ].join("\n");
    }

    function downloadFile() {
      if (!resultText) return;
      const raw = (document.getElementById("filenameInput").value || "output").trim();
      const name = raw.replace(/[^a-zA-Z0-9_\-\.]/g, "_") || "output";
      const a = document.createElement("a");
      const finalText = buildLuaHeader() + resultText;
      a.href = URL.createObjectURL(new Blob([finalText], { type: "text/plain" }));
      a.download = name + ".lua";
      a.click();
      toast("DOWNLOADED: " + name + ".lua");
    }
    
    
    function setFilter(f) {
      activeFilter = f;
      ["all", "updated", "try", "failed", "skipped"].forEach(k => { document.getElementById("fb-" + k).className = "filter-btn" + (k === f ? " f-" + k : ""); });
      renderLog();
    }
    
    function renderLog() {
      const body = document.getElementById("logBody");
      const empty = document.getElementById("logEmpty");
      const visible = activeFilter === "all" ? logItems : logItems.filter(x => x.type === activeFilter);
      Array.from(body.querySelectorAll(".log-card")).forEach(el => el.remove());
      if (visible.length === 0) { if (empty) empty.style.display = "flex"; return; }
      if (empty) empty.style.display = "none";
      const labels = { updated: "UPDATED", try: "TRY FOUND", failed: "NOT FOUND", skipped: "SKIPPED" };
      const explain = { updated: "Exact class-scoped signature match — offset replaced safely.", try: "Name match only (params/class differ). Replaced — VERIFY manually.", failed: "Signature not found in new dump — offset NOT replaced.", skipped: "Identified as color/palette value — intentionally skipped." };
      const arrSvg = '<svg class="arr-icon" viewBox="0 0 12 12" fill="none"><line x1="1" y1="6" x2="10" y2="6"/><polyline points="7,3 10,6 7,9"/></svg>';
      const iconMap = { updated: '<svg viewBox="0 0 14 14" fill="none"><polyline points="2,7 6,11 12,3" stroke-width="2"/></svg>', try: '<svg viewBox="0 0 14 14" fill="none"><path d="M7 2v5l3 3" stroke-width="1.5"/><circle cx="7" cy="7" r="5" stroke-width="1.3"/></svg>', failed: '<svg viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke-width="1.5"/></svg>', skipped: '<svg viewBox="0 0 14 14" fill="none"><line x1="3" y1="7" x2="11" y2="7" stroke-width="1.5"/></svg>' };
      visible.forEach((item, idx) => {
        const d = document.createElement("div");
        d.className = "log-card " + item.type;
        d.style.cursor = "pointer";
        d.style.animationDelay = (Math.min(idx, 24) * 16) + "ms";
        d.onclick = () => openModal(item);
        const offClass = item.type === "skipped" ? "off-skip" : "off-old";
        const classLabel = item.className ? '<span style="color:var(--warn);font-size:10px;font-family:var(--mono);margin-left:6px;opacity:.8;">' + escHtml(item.className) + '</span>' : "";
        const oldBlock = '<div class="off-block"><div class="off-hex ' + offClass + '">' + escHtml(item.oldOff) + '</div><div class="off-desc">' + escHtml(item.sig || "UNKNOWN") + classLabel + '</div></div>';
        const newBlock = item.newOff ? '<div class="off-block"><div class="off-hex off-new">' + escHtml(item.newOff) + '</div><div class="off-desc">' + escHtml(item.method || "") + '</div></div>' : '<div class="off-block"><div class="off-hex off-none">—</div><div class="off-desc">' + escHtml(item.method || "no match") + '</div></div>';
        d.innerHTML = '<div class="log-card-icon"><div class="status-circle">' + iconMap[item.type] + '</div></div><div class="log-card-body"><div class="log-card-top"><span class="log-card-status">' + labels[item.type] + '</span><span class="log-card-line">LINE ' + item.line + '</span></div><div class="log-card-offsets">' + oldBlock + arrSvg + newBlock + '</div><div class="log-card-explain"><span class="explain-dot"></span>' + explain[item.type] + '</div></div>';
        body.appendChild(d);
      });
    }
    
    
    window.addEventListener("keydown", e => { if (e.key === "Escape") closeModalForce(); });
    window.addEventListener("DOMContentLoaded", function() {
      const canvas = document.getElementById("particle-canvas");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      let W, H, particles = [];
      const COLORS = ["#00D97E", "#00D97E", "#00ff99", "#F0A500", "#E5474B", "#1e6644"];
      const COUNT = 50;
      
      function resize() { W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight; }
      
      function rand(a, b) { return a + Math.random() * (b - a); }
      
      function mk() { return { x: rand(0, W), y: rand(0, H), vx: rand(-0.2, 0.2), vy: rand(-0.4, -0.08), r: rand(1.2, 2.5), alpha: rand(0.2, 0.45), color: COLORS[Math.floor(Math.random() * COLORS.length)], pulse: rand(0, Math.PI * 2), ps: rand(0.008, 0.025) }; }
      
      function init() { particles = []; for (let i = 0; i < COUNT; i++) particles.push(mk()); }
      
      function draw() {
        ctx.clearRect(0, 0, W, H);
        for (let i = 0; i < particles.length; i++)
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x,
              dy = particles[i].y - particles[j].y,
              d2 = dx * dx + dy * dy;
            if (d2 < 12000) { const f = 1 - d2 / 12000;
              ctx.globalAlpha = f * 0.1;
              ctx.strokeStyle = "#00D97E";
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke(); }
          }
        particles.forEach(p => { p.pulse += p.ps;
          ctx.globalAlpha = p.alpha * (0.75 + 0.25 * Math.sin(p.pulse));
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          p.x += p.vx;
          p.y += p.vy; if (p.y < -6) p.y = H + 6; if (p.x < -6) p.x = W + 6; if (p.x > W + 6) p.x = -6; });
        ctx.globalAlpha = 1;
        requestAnimationFrame(draw);
      }
      resize();
      init();
      draw();
      window.addEventListener("resize", () => { resize();
        init(); });
    });
    
    
    (function() {
      const DB_NAME = 'ShanDumpSave', DB_VER = 1, STORE = 'dumps';
      let db = null;

      function openDB() {
        return new Promise((res, rej) => {
          const r = indexedDB.open(DB_NAME, DB_VER);
          r.onupgradeneeded = e => e.target.result.createObjectStore(STORE);
          r.onsuccess = e => { db = e.target.result; res(db); };
          r.onerror   = () => rej(r.error);
        });
      }
      function dbPut(k, v) {
        return new Promise((res) => {
          if (!db) return res(false);
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(v, k);
          tx.oncomplete = () => res(true);
          tx.onerror    = () => res(false);
        });
      }
      function dbGet(k) {
        return new Promise(res => {
          if (!db) return res(null);
          const tx = db.transaction(STORE, 'readonly');
          const r  = tx.objectStore(STORE).get(k);
          r.onsuccess = () => res(r.result || null);
          r.onerror   = () => res(null);
        });
      }
      function dbDel(k) {
        return new Promise(res => {
          if (!db) return res();
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).delete(k);
          tx.oncomplete = res;
        });
      }

      function formatAge(ts) {
        const d = Date.now() - ts, m = Math.floor(d/60000), h = Math.floor(d/3600000);
        if (m < 1)  return 'just now';
        if (m < 60) return m + 'm ago';
        if (h < 24) return h + 'h ago';
        return Math.floor(d/86400000) + 'd ago';
      }

      function applyTag(key, type) {
        const tag = document.getElementById('saved-tag-' + key);
        if (!tag) return;
        tag.textContent  = type === 'restored' ? '\u27F3 RESTORED' : '\u2713 SAVED';
        tag.className    = 'slot-saved-tag' + (type === 'restored' ? ' restored' : '');
      }


      function patchSlot(key) {
        const input = document.getElementById('input-' + key);
        const slot  = document.getElementById('slot-' + key);
        if (!input || !slot) return;

      
        const origOnchange = input.onchange;
        input.onchange = async function() {
          if (origOnchange) origOnchange.call(this);
          const f = input.files[0];
          if (!f) return;
          try {
            const text = await readText(f);
            await dbPut('dump_' + key, { name: f.name, size: f.size, text, savedAt: Date.now() });
            applyTag(key, 'saved');
          } catch(e) {}
        };

        
        const origDrop = slot.ondrop;
        slot.ondrop = async function(e) {
          if (origDrop) origDrop.call(this, e);
          const f = e.dataTransfer && e.dataTransfer.files[0];
          if (!f) return;
          try {
            const text = await readText(f);
            await dbPut('dump_' + key, { name: f.name, size: f.size, text, savedAt: Date.now() });
            applyTag(key, 'saved');
          } catch(e) {}
        };

       
        const clearBtn = document.getElementById('clear-btn-' + key);
        if (clearBtn) {
          clearBtn.addEventListener('click', async function(e) {
            e.stopPropagation();            
            document.getElementById('lbl-' + key).style.display = 'block';
            document.getElementById('name-' + key).style.display = 'none';
            document.getElementById('size-' + key).textContent = '';
            slot.classList.remove('loaded');
            F[key] = null;
            const tag = document.getElementById('saved-tag-' + key);
            if (tag) tag.style.display = 'none';
            await dbDel('dump_' + key);
            toast('CLEARED: ' + key.toUpperCase() + ' dump');
          });
        }
      }

    
      async function restoreSaved() {
        for (const key of ['old', 'new']) {
          const saved = await dbGet('dump_' + key);
          if (!saved) continue;
          try {
           
            const blob = new Blob([saved.text], { type: 'text/plain' });
            const file = new File([blob], saved.name, { type: 'text/plain', lastModified: saved.savedAt });
            F[key] = file;

            
            const lbl = document.getElementById('lbl-' + key);
            const nm  = document.getElementById('name-' + key);
            const sz  = document.getElementById('size-' + key);
            const slot = document.getElementById('slot-' + key);
            if (lbl) lbl.style.display = 'none';
            nm.style.display  = 'block';
            nm.textContent    = saved.name;
            sz.textContent    = (saved.size / 1024).toFixed(2) + ' KB';
            slot.classList.add('loaded');

            applyTag(key, 'restored');
            toast('\u27F3 RESTORED: ' + saved.name + ' · saved ' + formatAge(saved.savedAt));
          } catch(e) {}
        }
      }

    
      openDB().then(() => {
        patchSlot('old');
        patchSlot('new');
        restoreSaved();
      }).catch(() => {});
    })();
