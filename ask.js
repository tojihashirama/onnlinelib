(function () {
  "use strict";

  var dumps = { old: null, new: null }; // { name, text }
  var script = null; // { name, text }
  var scriptPendingDisplay = false; // true right after attaching, until it's shown in a sent message
  var history = []; // [{role:'user'|'ai', text:'...'}]

  var thread   = document.getElementById("chatThread");
  var emptyEl  = document.getElementById("chatEmpty");
  var input    = document.getElementById("chatInput");
  var sendBtn  = document.getElementById("chatSendBtn");

  // ── mode toggle: Offset Finder / Offset Updator / Analyze Offset ──
  var mode = "finder"; // "finder" | "updator" | "analyze"
  var modeBtns  = document.querySelectorAll(".chat-mode-btn");
  var modeHint  = document.getElementById("chatModeHint");
  var MODE_HINTS = {
    finder:  "Search loaded dump.cs for an exact offset or class/field name.",
    updator: "Attach a script + old/new dump.cs above, then send anything to refresh its offsets.",
    analyze: "Always explains what an offset or class likely represents \u2014 not just whether it changed."
  };
  var MODE_PLACEHOLDERS = {
    finder:  "0x123456, ClassName.Method, or 'update this'",
    updator: "Type anything to run the update (or 'update this')",
    analyze: "0x123456 or ClassName \u2014 I'll explain what it is"
  };

  modeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      mode = btn.getAttribute("data-mode");
      modeBtns.forEach(function (b) { b.classList.toggle("active", b === btn); });
      if (modeHint) modeHint.textContent = MODE_HINTS[mode] || "";
      if (input) input.placeholder = MODE_PLACEHOLDERS[mode] || input.placeholder;
    });
  });

  // ── old/new dump.cs upload slots (top of page) ──
  function wireSlot(key, slotId, fileId, plusId, labelId, nameId, defaultLabel) {
    var slot = document.getElementById(slotId);
    var file = document.getElementById(fileId);
    var plus = document.getElementById(plusId);
    var label = document.getElementById(labelId);
    var nameEl = document.getElementById(nameId);

    slot.addEventListener("click", function () { file.click(); });

    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        dumps[key] = { name: f.name, text: String(e.target.result || "") };
        slot.classList.add("loaded");
        plus.textContent = "\u2713";
        label.textContent = defaultLabel + " loaded";
        nameEl.textContent = f.name + " \u00B7 " + Math.round(f.size / 1024) + " KB";
        showToast("ATTACHED: " + f.name);
      };
      reader.onerror = function () {
        addMessage("ai", "Couldn't read " + f.name + " — please try again.", true);
      };
      reader.readAsText(f);
    });
  }

  wireSlot("old", "chatSlotOld", "chatFileOld", "chatPlusOld", "chatLabelOld", "chatNameOld", "Old dump.cs");
  wireSlot("new", "chatSlotNew", "chatFileNew", "chatPlusNew", "chatLabelNew", "chatNameNew", "New dump.cs");

  // ── script attach (composer "+" button \u2014 opens the file picker directly) ──
  var chipRow      = document.getElementById("chatChipRow");
  var attachBtn    = document.getElementById("chatAttachBtn");
  var scriptFile   = document.getElementById("chatFileScript");

  function renderScriptChip() {
    chipRow.innerHTML = "";
    attachBtn.classList.toggle("attached", !!script);
    if (!script) return;

    var chip = document.createElement("div");
    chip.className = "chat-chip script";

    var info = document.createElement("div");
    info.className = "chat-chip-info";
    var tag = document.createElement("div");
    tag.className = "chat-chip-tag";
    tag.textContent = "SCRIPT";
    var name = document.createElement("div");
    name.className = "chat-chip-name";
    name.textContent = script.name;
    info.appendChild(tag);
    info.appendChild(name);
    chip.appendChild(info);

    var removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "chat-chip-remove";
    removeBtn.textContent = "\u2715";
    removeBtn.title = "Remove";
    removeBtn.addEventListener("click", function () {
      script = null;
      scriptPendingDisplay = false;
      scriptFile.value = "";
      renderScriptChip();
    });
    chip.appendChild(removeBtn);

    chipRow.appendChild(chip);
  }

  attachBtn.addEventListener("click", function () { scriptFile.click(); });

  scriptFile.addEventListener("change", function () {
    var f = scriptFile.files && scriptFile.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      script = { name: f.name, text: String(e.target.result || "") };
      scriptPendingDisplay = true;
      renderScriptChip();
      showToast("ATTACHED: " + f.name);
    };
    reader.onerror = function () {
      addMessage("ai", "Couldn't read " + f.name + " — please try again.", true);
    };
    reader.readAsText(f);
  });

  // ── toast (ask.php has no shared #toast from index.php, so it gets its own) ──
  var toastEl = null;
  function ensureToast() {
    if (toastEl) return toastEl;
    toastEl = document.createElement("div");
    toastEl.className = "chat-toast";
    toastEl.id = "chatToast";
    document.body.appendChild(toastEl);
    return toastEl;
  }
  var toastTimer = null;
  function showToast(msg) {
    var t = ensureToast();
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1600);
  }

  function copyText(text, btnEl) {
    function done() {
      showToast("COPIED: " + text);
      if (btnEl) {
        btnEl.classList.add("copied");
        setTimeout(function () { btnEl.classList.remove("copied"); }, 900);
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text);
      done();
    }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  function downloadText(filename, text) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = filename;
    a.click();
    showToast("DOWNLOADED: " + filename);
  }

  function splitIdentifier(str) {
    return str
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_\.\-]+/g, " ")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }

  function tokenize(query) {
    return query
      .toLowerCase()
      .split(/\s+/)
      .map(function (t) { return t.replace(/^0x/, ""); })
      .filter(Boolean);
  }


  function extractIdentifier(line) {
    var offsetMatch = line.match(/0x[0-9a-fA-F]+/);
    var offset = offsetMatch ? offsetMatch[0] : null;

    var nameMatch =
      line.match(/\b(?:class|struct|enum)\s+([A-Za-z_][A-Za-z0-9_]*)/) ||
      line.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/) || // method
      line.match(/[\w<>\[\],\s\*]+\s([A-Za-z_][A-Za-z0-9_]*)\s*[;=]/); // field/prop

    var name = nameMatch ? nameMatch[1] : null;
    return { name: name, offset: offset };
  }


  function searchDumps(query) {
    var q = query.trim();
    if (!q) return { context: "", best: null, matchCount: 0 };

    var isHex = /^0x[0-9a-fA-F]+$/.test(q);
    var tokens = isHex ? [q.replace(/^0x/, "").toLowerCase()] : tokenize(q);

    var CONTEXT = 1;
    var MAX_BLOCKS = 14;

    var blocks = []; // {key, lineNo, text, score}

    ["old", "new"].forEach(function (key) {
      var d = dumps[key];
      if (!d || !d.text) return;
      var lines = d.text.split(/\r?\n/);

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line.trim()) continue;
        var hay = line.toLowerCase();

        var score = 0;
        if (isHex) {
          if (hay.indexOf("0x" + tokens[0]) !== -1 || hay.indexOf(tokens[0]) !== -1) score = 100;
        } else {
          var lineWords = null; // computed lazily below, only if a token needs the fuzzy fallback
          tokens.forEach(function (tok) {
            if (hay.indexOf(tok) !== -1) {
              score += 2; // direct substring hit (strong) — cheap, checked first
            } else {
              if (lineWords === null) lineWords = splitIdentifier(line); // only pay for this when the cheap check missed
              if (lineWords.some(function (w) { return w.indexOf(tok) === 0 || tok.indexOf(w) === 0; })) {
                score += 1; // fuzzy identifier-fragment hit (weaker)
              }
            }
          });
        }

        if (score > 0) {
          blocks.push({ key: key, lineNo: i + 1, score: score, idx: i, lines: lines });
        }
      }
    });

    // best match per dump.cs: highest score, NEW takes priority on ties
    blocks.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (a.key !== b.key) return a.key === "new" ? -1 : 1;
      return 0;
    });

    var out = [];
    var used = blocks.slice(0, MAX_BLOCKS);
    used.forEach(function (b) {
      var start = Math.max(0, b.idx - CONTEXT);
      var end = Math.min(b.lines.length - 1, b.idx + CONTEXT);
      var blockText = b.lines.slice(start, end + 1).join("\n");
      out.push("[" + (b.key === "new" ? "NEW" : "OLD") + " dump.cs, line " + b.lineNo + "]\n" + blockText);
    });

    // pick the best structured match for the card — prefer NEW dump.cs,
    // and require it to actually contain a usable identifier+offset.
    var best = null;
    var newCandidates = blocks.filter(function (b) { return b.key === "new"; });
    var oldCandidates = blocks.filter(function (b) { return b.key === "old"; });
    var pool = newCandidates.length ? newCandidates : oldCandidates;

    for (var p = 0; p < pool.length; p++) {
      var b = pool[p];
      var parsed = extractIdentifier(b.lines[b.idx]);
      if (parsed.offset) {
        best = {
          key: b.key,
          lineNo: b.lineNo,
          name: parsed.name || query.trim(),
          offset: parsed.offset,
          line: b.lines[b.idx].trim()
        };
        break;
      }
    }

    var topMatches = blocks.slice(0, 6).map(function (b) {
      return { key: b.key, lineNo: b.lineNo, score: b.score, line: b.lines[b.idx].trim() };
    });

    return { context: out.join("\n\n"), best: best, matchCount: blocks.length, topMatches: topMatches };
  }


  function normHex(h) { return "0x" + h.replace(/^0x/i, "").toUpperCase(); }

  var COLOR_CONTEXT_RE = /\b(colou?r|rgba?|argb|paint|brush|fill|stroke|tint|palette|hex|background|foreground)\b/i;

  function isColorByte(b) {
    var v = parseInt(b, 16);
    var hi = (v >> 4) & 0xF, lo = v & 0xF;
    return hi === lo || v === 0 || v === 255 || v === 128;
  }

  function isColorHex(hexStr, lineCtx) {
    if (COLOR_CONTEXT_RE.test(lineCtx)) return true;
    var digits = hexStr.replace(/^0x/i, "");
    var len = digits.length;
    if (len === 8) {
      var pairs = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6), digits.slice(6, 8)];
      if (pairs.filter(function (p) { return isColorByte(p); }).length >= 3) return true;
    }
    return false;
  }

  var MODIFIERS = { "public":1,"private":1,"protected":1,"internal":1,"static":1,"virtual":1,"override":1,
    "abstract":1,"sealed":1,"readonly":1,"const":1,"new":1,"extern":1,"async":1,"unsafe":1,"partial":1,"volatile":1,"fixed":1 };

  function normalizeParams(pStr) {
    if (!pStr || !pStr.trim()) return "";
    return pStr.split(",").map(function (p) {
      var parts = p.trim().split(/\s+/).filter(function (w) {
        return ["ref","out","in","params"].indexOf(w.toLowerCase()) === -1;
      });
      return (parts[0] || "").toLowerCase();
    }).filter(Boolean).join(",");
  }

  function extractSigs(ln) {
    var clean = ln.replace(/\{[^}]*\}/g, "").replace(/;$/, "").replace(/\/\/.*$/, "").trim();
    if (!clean) return null;
    var mMatch = clean.match(/(\.?\w+)\s*\(([^)]*)\)/);
    if (mMatch) {
      var name = mMatch[1].toLowerCase();
      var params = normalizeParams(mMatch[2]);
      var simple = name + "(" + params + ")";
      var tokens = clean.split(/\s+/).filter(function (t) { return !MODIFIERS[t.toLowerCase()]; });
      var stripped = tokens.join(" ");
      var fMatch = stripped.match(/(\w+)\s+(\.?\w+)\s*\(([^)]*)\)/);
      var full = fMatch ? fMatch[1].toLowerCase() + "|" + fMatch[2].toLowerCase() + "(" + normalizeParams(fMatch[3]) + ")" : simple;
      return { simple: simple, full: full };
    }
    var fMatch2 = clean.match(/(\.?\w+)\s*(?:;|\{|$)/);
    if (fMatch2) { var nm = fMatch2[1].toLowerCase(); return { simple: nm + "()", full: nm + "()" }; }
    return null;
  }

  function extractClassName(ln) {
    var m = ln.match(/(?:class|struct|interface|enum)\s+(\w+)/);
    return m ? m[1].toLowerCase() : null;
  }

  var FIELD_INLINE_RE = /(\w+)\s*;\s*\/\/\s*(0x[0-9a-fA-F]+)\s*$/;

  function parseDump(text) {
    var lines = text.split(/\r?\n/);
    var rvaRe = /\/\/\s*(?:RVA:\s*0x[0-9a-fA-F]+\s+)?Offset:\s*(0x[0-9a-fA-F]+)/i;
    var FIELD_OFFSET_RE = /\/\/\s*0x[0-9a-fA-F]+\s*$/;
    var CLASS_RE = /(?:class|struct|interface|enum)\s+\w+/;
    var offsetMap = new Map(), simpleMap = new Map(), fullMap = new Map(), classedMap = new Map();
    var fieldOffsetMap = new Map(), fieldByClassAndName = new Map();
    var currentClass = "";
    for (var i = 0; i < lines.length; i++) {
      var rawLine = lines[i];
      if (CLASS_RE.test(rawLine) && rawLine.trim().indexOf("//") !== 0) {
        var cn = extractClassName(rawLine.trim());
        if (cn) currentClass = cn;
      }
      if (rawLine.trim().indexOf("//") !== 0 && rawLine.indexOf(";") !== -1 && rawLine.indexOf("// 0x") !== -1) {
        var fm = rawLine.match(FIELD_INLINE_RE);
        if (fm) {
          var fieldName = fm[1].toLowerCase();
          var offset = normHex(fm[2]);
          var entry = { type: "field", fieldName: fieldName, className: currentClass, offset: offset };
          if (!fieldOffsetMap.has(offset)) fieldOffsetMap.set(offset, []);
          fieldOffsetMap.get(offset).push(entry);
          var key = currentClass + "::" + fieldName;
          if (!fieldByClassAndName.has(key)) fieldByClassAndName.set(key, entry);
        }
      }
      var m = rawLine.match(rvaRe);
      if (!m) continue;
      var off = normHex(m[1]);
      if (offsetMap.has(off)) continue;
      for (var j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        var ln = lines[j].trim();
        if (!ln || ln.indexOf("//") === 0 || ln.indexOf("[") === 0 || ln === "{" || ln === "}") continue;
        if (ln.indexOf("(") === -1 && FIELD_OFFSET_RE.test(ln)) continue;
        if (ln.indexOf("(") === -1 && ln.indexOf("{") !== -1) continue;
        var sigs = extractSigs(ln);
        if (!sigs) continue;
        var classedKey = currentClass + "::" + sigs.full;
        var classedSimpleKey = currentClass + "::" + sigs.simple;
        var entryM = { simple: sigs.simple, full: sigs.full, raw: ln, offset: off, className: currentClass, classedKey: classedKey, classedSimpleKey: classedSimpleKey };
        offsetMap.set(off, entryM);
        if (!classedMap.has(classedKey)) classedMap.set(classedKey, entryM);
        if (!classedMap.has(classedSimpleKey)) classedMap.set(classedSimpleKey, entryM);
        if (!simpleMap.has(sigs.simple)) simpleMap.set(sigs.simple, entryM);
        if (!fullMap.has(sigs.full)) fullMap.set(sigs.full, entryM);
        break;
      }
    }
    return { offsetMap: offsetMap, simpleMap: simpleMap, fullMap: fullMap, classedMap: classedMap, fieldOffsetMap: fieldOffsetMap, fieldByClassAndName: fieldByClassAndName };
  }

  function lookupNewOffset(oldEntry, newDump) {
    if (oldEntry.className) {
      var cfe = newDump.classedMap.get(oldEntry.classedKey);
      if (cfe) return { newOff: cfe.offset, newRaw: cfe.raw, method: "CLASS_FULL_SIG", isTry: false };
      var cse = newDump.classedMap.get(oldEntry.classedSimpleKey);
      if (cse) return { newOff: cse.offset, newRaw: cse.raw, method: "CLASS_SIMPLE_SIG", isTry: false };
      var nameOnly = oldEntry.simple.split("(")[0];
      var classNamePrefix = oldEntry.className + "::";
      var iter = newDump.classedMap.entries();
      var step;
      while (!(step = iter.next()).done) {
        var sig = step.value[0], e = step.value[1];
        if (sig.indexOf(classNamePrefix) === 0) {
          var methodPart = sig.slice(classNamePrefix.length);
          if (methodPart.split("(")[0] === nameOnly) {
            return { newOff: e.offset, newRaw: e.raw, method: "CLASS_NAME_SCAN", isTry: true };
          }
        }
      }
    }
    var fe = newDump.fullMap.get(oldEntry.full);
    if (fe) return { newOff: fe.offset, newRaw: fe.raw, method: "FULL_SIG", isTry: false };
    var se = newDump.simpleMap.get(oldEntry.simple);
    if (se) return { newOff: se.offset, newRaw: se.raw, method: "SIMPLE_SIG", isTry: true };
    var baseName = oldEntry.simple.split("(")[0] + "()";
    var ne = newDump.simpleMap.get(baseName);
    if (ne) return { newOff: ne.offset, newRaw: ne.raw, method: "NAME_ONLY", isTry: true };
    var nameOnly2 = oldEntry.simple.split("(")[0];
    var iter2 = newDump.simpleMap.entries();
    var step2;
    while (!(step2 = iter2.next()).done) {
      var sig2 = step2.value[0], e2 = step2.value[1];
      if (sig2.split("(")[0] === nameOnly2) return { newOff: e2.offset, newRaw: e2.raw, method: "NAME_SCAN", isTry: true };
    }
    return null;
  }

  function lookupFieldOffset(nh, oldDump, newDump) {
    var candidates = oldDump.fieldOffsetMap.get(nh);
    if (!candidates || candidates.length === 0) return null;
    var matches = [];
    candidates.forEach(function (cand) {
      var key = cand.className + "::" + cand.fieldName;
      var newEntry = newDump.fieldByClassAndName.get(key);
      if (newEntry) matches.push({ newOff: newEntry.offset, sig: cand.fieldName, className: cand.className, method: "FIELD:" + cand.className + "::" + cand.fieldName });
    });
    if (matches.length === 0) return null;
    var allAgree = matches.every(function (r) { return r.newOff === matches[0].newOff; });
    if (allAgree && matches.length === 1) {
      var r0 = matches[0];
      return { newOff: r0.newOff, sig: r0.sig, className: r0.className, method: r0.method, isTry: false, desc: r0.className + "::" + r0.sig };
    }
    if (allAgree) {
      var r1 = matches[0];
      return { newOff: r1.newOff, sig: r1.sig, className: r1.className, method: "FIELD_MULTI_AGREE(" + matches.length + ")", isTry: false, desc: r1.className + "::" + r1.sig };
    }
    var r2 = matches[0];
    return { newOff: r2.newOff, sig: r2.sig, className: r2.className, method: "FIELD_AMBIGUOUS(" + matches.length + " classes)", isTry: true, desc: candidates.map(function (c) { return c.className + "::" + c.fieldName; }).join(", ") };
  }

  // Runs the full deterministic update pass over the loaded script using the
  // loaded old/new dump.cs. Mirrors app.js's run(), minus the UI progress bar.
  // Also records a step-by-step `events` log (parse steps + per-token match
  // results) so the UI can replay them as a live "running" trace.
  function updateScript(safeColor, safeStrict) {
    var events = [];
    function log(type, text) { events.push({ type: type, text: text }); }

    log("info", "Parsing old dump.cs (" + dumps.old.name + ")\u2026");
    var oldDump = parseDump(dumps.old.text);
    log("ok", "Indexed " + oldDump.offsetMap.size + " method offset(s), " + oldDump.fieldOffsetMap.size + " field offset(s) from OLD dump");

    log("info", "Parsing new dump.cs (" + dumps.new.name + ")\u2026");
    var newDump = parseDump(dumps.new.text);
    log("ok", "Indexed " + newDump.offsetMap.size + " method offset(s), " + newDump.fieldOffsetMap.size + " field offset(s) from NEW dump");

    log("info", "Scanning " + script.name + " for hex offset tokens\u2026");
    var lines = script.text.split(/\r?\n/);
    var out = [];
    var stats = { updated: 0, try: 0, failed: 0, skipped: 0 };
    var hexRe = /0x[0-9a-fA-F]+/gi;
    var seenTokens = 0;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var tokens = new Map();
      var m;
      hexRe.lastIndex = 0;
      while ((m = hexRe.exec(line)) !== null) {
        var nh = normHex(m[0]);
        if (!tokens.has(nh)) tokens.set(nh, m[0]);
      }
      var iter = tokens.entries();
      var step;
      while (!(step = iter.next()).done) {
        var nhKey = step.value[0], original = step.value[1];
        seenTokens++;

        if (safeColor && isColorHex(nhKey, line)) {
          if (oldDump.offsetMap.has(nhKey)) {
            stats.skipped++;
            log("warn", "L" + (i + 1) + " " + nhKey + " looks like a color value \u2014 skipped");
          }
          continue;
        }

        var oldEntry = oldDump.offsetMap.get(nhKey);
        if (!oldEntry) {
          if (!safeStrict) {
            var fieldResult = lookupFieldOffset(nhKey, oldDump, newDump);
            if (fieldResult && fieldResult.newOff !== nhKey) {
              var esc0 = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              line = line.replace(new RegExp(esc0, "gi"), fieldResult.newOff);
              if (fieldResult.isTry) {
                stats.try++;
                log("warn", "L" + (i + 1) + " field " + fieldResult.desc + " " + nhKey + " \u2192 " + fieldResult.newOff + " (verify)");
              } else {
                stats.updated++;
                log("ok", "L" + (i + 1) + " field " + fieldResult.desc + " " + nhKey + " \u2192 " + fieldResult.newOff);
              }
            }
          }
          continue;
        }

        log("scan", "L" + (i + 1) + " matching " + (oldEntry.className ? oldEntry.className + "::" : "") + oldEntry.simple + " (" + nhKey + ")\u2026");

        var result = lookupNewOffset(oldEntry, newDump);
        if (result && !result.isTry) {
          if (result.newOff !== nhKey) {
            var esc1 = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            line = line.replace(new RegExp(esc1, "gi"), result.newOff);
            stats.updated++;
            log("ok", "L" + (i + 1) + " " + nhKey + " \u2192 " + result.newOff + " (" + result.method + ")");
          } else {
            log("ok", "L" + (i + 1) + " " + nhKey + " unchanged \u2014 already current");
          }
        } else if (result && result.isTry) {
          var esc2 = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          line = line.replace(new RegExp(esc2, "gi"), result.newOff);
          stats.try++;
          log("warn", "L" + (i + 1) + " " + nhKey + " \u2192 " + result.newOff + " (" + result.method + " \u2014 verify)");
        } else {
          stats.failed++;
          log("fail", "L" + (i + 1) + " " + nhKey + " \u2014 no match found in NEW dump");
        }
      }
      out.push(line);
    }

    log("info", "Scanned " + seenTokens + " hex token(s) across " + lines.length + " line(s)");
    log("ok", "Done \u2014 " + stats.updated + " updated, " + stats.try + " to verify, " + stats.failed + " failed, " + stats.skipped + " skipped");

    return { text: out.join("\n"), stats: stats, events: events };
  }

  // Detects "please update this" intent in English/Taglish so users don't
  // have to type an exact command — covers casual phrasings like
  // "pwede mo ba i-update to", "update this script", "i-update mo to".
  var UPDATE_INTENT_RE = /\b(update|i-?update|paupdate|i-?refresh|refresh)\b.*\b(this|to|na ?to|nito|script|file)\b|\bi-?update\s*(mo)?\s*(ba)?\s*(to|ito|nito)\b|\bpa.?update\b/i;

  function isUpdateIntent(q) {
    return UPDATE_INTENT_RE.test(q);
  }

  // Detects "list methods ClassName" / "/methods ClassName" so the user can
  // browse everything a class exposes instead of looking up one offset at
  // a time. Returns the class name if matched, else null.
  var METHODS_CMD_RE = /^\s*\/methods\s+(.+)$|\b(?:list|show)\s+(?:the\s+)?methods?\s+(?:of|for|in)?\s*([A-Za-z_][A-Za-z0-9_]*)\b|\bmethods?\s+(?:of|for|in)\s+([A-Za-z_][A-Za-z0-9_]*)\b/i;

  function matchMethodsCommand(q) {
    var m = q.match(METHODS_CMD_RE);
    if (!m) return null;
    var className = (m[1] || m[2] || m[3] || "").trim();
    return className || null;
  }


  function listClassMethods(className) {
    var target = className.toLowerCase();
    var source = (dumps.new && dumps.new.text) ? "new" : (dumps.old && dumps.old.text) ? "old" : null;
    if (!source) return null;

    var parsed = parseDump(dumps[source].text);
    var methods = [];
    var fields = [];
    var seenMethodKeys = {};

    parsed.offsetMap.forEach(function (entry) {
      if (entry.className !== target) return;
      var key = entry.simple + "@" + entry.offset;
      if (seenMethodKeys[key]) return;
      seenMethodKeys[key] = true;
      methods.push({ signature: entry.simple, offset: entry.offset, raw: entry.raw });
    });

    parsed.fieldByClassAndName.forEach(function (entry, key) {
      if (entry.className !== target) return;
      fields.push({ name: entry.fieldName, offset: entry.offset });
    });

    methods.sort(function (a, b) { return a.signature.localeCompare(b.signature); });
    fields.sort(function (a, b) { return a.name.localeCompare(b.name); });

    return { source: source, methods: methods, fields: fields, className: className };
  }

  // ── rendering ──
  function scrollToBottom() {
    
    thread.scrollTop = thread.scrollHeight;
  }


  function renderInline(container, text) {
    var rest = text;
    var re = /(\*\*([^*]+)\*\*)|(`([^`]+)`)/g;
    var lastIndex = 0;
    var m;
    while ((m = re.exec(rest)) !== null) {
      if (m.index > lastIndex) {
        container.appendChild(document.createTextNode(rest.slice(lastIndex, m.index)));
      }
      if (m[1]) {
        var strong = document.createElement("strong");
        strong.textContent = m[2];
        container.appendChild(strong);
      } else if (m[3]) {
        var code = document.createElement("code");
        code.textContent = m[4];
        container.appendChild(code);
      }
      lastIndex = re.lastIndex;
    }
    if (lastIndex < rest.length) {
      container.appendChild(document.createTextNode(rest.slice(lastIndex)));
    }
  }

  function renderFormattedBody(bodyEl, text) {
    var lines = String(text || "").split(/\r?\n/);
    var i = 0;
    var ul = null;

    while (i < lines.length) {
      var line = lines[i];
      var trimmed = line.trim();

      if (trimmed === "") { ul = null; i++; continue; }

      if (/^[-*]\s+/.test(trimmed)) {
        if (!ul) { ul = document.createElement("ul"); bodyEl.appendChild(ul); }
        var li = document.createElement("li");
        renderInline(li, trimmed.replace(/^[-*]\s+/, ""));
        ul.appendChild(li);
        i++;
        continue;
      }

      ul = null;
      var p = document.createElement("p");
      renderInline(p, trimmed.replace(/^#{1,4}\s*/, ""));
      if (/^#{1,4}\s/.test(trimmed)) {
        var strongWrap = document.createElement("strong");
        strongWrap.textContent = p.textContent;
        p.textContent = "";
        p.appendChild(strongWrap);
      }
      bodyEl.appendChild(p);
      i++;
    }
  }

  
  function buildToolTrace(steps, headerLabel) {
    var wrap = document.createElement("div");
    wrap.className = "chat-trace";

    var header = document.createElement("div");
    header.className = "chat-trace-header";
    var chev = document.createElement("span");
    chev.className = "chat-trace-chevron";
    chev.innerHTML = '<svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="3,4.5 6,7.5 9,4.5"/></svg>';
    var headerText = document.createElement("span");
    headerText.textContent = headerLabel || ("Ran " + steps.length + " step" + (steps.length > 1 ? "s" : ""));
    header.appendChild(chev);
    header.appendChild(headerText);
    wrap.appendChild(header);

    var list = document.createElement("div");
    list.className = "chat-trace-list";
    wrap.appendChild(list);

    header.addEventListener("click", function () {
      list.classList.toggle("collapsed");
      header.classList.toggle("collapsed");
    });

    var stepEls = steps.map(function (s) {
      var stepEl = document.createElement("div");
      stepEl.className = "chat-trace-step";

      var iconEl = document.createElement("div");
      iconEl.className = "chat-trace-step-icon";
      iconEl.innerHTML = s.icon === "file"
        ? '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="2" width="9" height="12" rx="1"/><polyline points="9,2 9,5 12,5"/></svg>'
        : '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><polyline points="5,4 1,8 5,12"/><polyline points="11,4 15,8 11,12"/></svg>';

      var body = document.createElement("div");
      body.className = "chat-trace-step-body";

      var titleRow = document.createElement("div");
      titleRow.className = "chat-trace-step-title-row";
      var titleEl = document.createElement("span");
      titleEl.className = "chat-trace-step-title";
      titleEl.textContent = s.title;
      titleRow.appendChild(titleEl);

      if (s.code) {
        var stepChev = document.createElement("span");
        stepChev.className = "chat-trace-step-chevron";
        stepChev.innerHTML = '<svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="3,4.5 6,7.5 9,4.5"/></svg>';
        titleRow.appendChild(stepChev);
        body.style.cursor = "pointer";
      }
      body.appendChild(titleRow);

      if (s.tag) {
        var tagEl = document.createElement("span");
        tagEl.className = "chat-trace-step-tag";
        tagEl.textContent = s.tag;
        body.appendChild(tagEl);
      }

      if (s.code) {
        var codeEl = document.createElement("pre");
        codeEl.className = "chat-trace-code";
        codeEl.textContent = s.code;
        body.appendChild(codeEl);
        body.addEventListener("click", function () {
          stepEl.classList.toggle("expanded");
        });
      }

      stepEl.appendChild(iconEl);
      stepEl.appendChild(body);
      list.appendChild(stepEl);
      return stepEl;
    });

    var doneRow = document.createElement("div");
    doneRow.className = "chat-trace-done";
    doneRow.innerHTML = '<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="2,7 6,11 12,3"/></svg><span>Done</span>';
    wrap.appendChild(doneRow);

    function play() {
      return new Promise(function (resolve) {
        stepEls.forEach(function (el) { el.classList.add("pending"); });
        var i = 0;
        function next() {
          if (i < stepEls.length) {
            stepEls[i].classList.remove("pending");
            i++;
            scrollToBottom();
            setTimeout(next, 110 + Math.floor(Math.random() * 110));
          } else {
            wrap.classList.add("done");
            scrollToBottom();
            resolve();
          }
        }
        setTimeout(next, 60);
      });
    }

    return { el: wrap, play: play };
  }


  function capLines(lines, max) {
    if (lines.length <= max) return lines.join("\n");
    return lines.slice(0, max).join("\n") + "\n\u2026 +" + (lines.length - max) + " more line(s)";
  }

  function buildOffsetCard(best) {
    var wrap = document.createElement("div");

    var source = document.createElement("div");
    source.className = "chat-offset-source";
    source.textContent = (best.key === "new" ? "From NEW dump.cs" : "From OLD dump.cs") + " \u00B7 line " + best.lineNo;
    wrap.appendChild(source);

    var line = document.createElement("div");
    line.className = "chat-offset-line";

    var nameEl = document.createElement("span");
    nameEl.className = "name";
    nameEl.textContent = best.name;
    line.appendChild(nameEl);

    var label = document.createElement("span");
    label.className = "label";
    label.textContent = "\u2192";
    line.appendChild(label);

    var copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "chat-offset-inline-copy";
    copyBtn.title = "Copy offset";
    copyBtn.innerHTML = '<span>' + best.offset + '</span><svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="4.5" y="4.5" width="8" height="8" rx="1"/><path d="M2.5 9.5h-1v-8a1 1 0 011-1h8v1"/></svg>';
    copyBtn.addEventListener("click", function () { copyText(best.offset, copyBtn); });
    line.appendChild(copyBtn);

    wrap.appendChild(line);
    return wrap;
  }

  function buildUpdateCard(updateResult, scriptName) {
    var card = document.createElement("div");
    card.className = "chat-diff-card collapsed";

    var header = document.createElement("div");
    header.className = "chat-diff-header";

    var icon = document.createElement("div");
    icon.className = "chat-diff-icon";
    icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="1.5" width="11" height="13" rx="1"/><polyline points="9,1.5 9,5.5 13,5.5"/></svg>';
    header.appendChild(icon);

    var nameEl = document.createElement("div");
    nameEl.className = "chat-diff-filename";
    nameEl.textContent = scriptName;
    header.appendChild(nameEl);

    var countsEl = document.createElement("div");
    countsEl.className = "chat-diff-counts";
    var changed = updateResult.stats.updated + updateResult.stats.try;
    countsEl.innerHTML = '<span class="plus">+' + changed + '</span><span class="minus">-' + updateResult.stats.failed + '</span>';
    header.appendChild(countsEl);

    var chevron = document.createElement("div");
    chevron.className = "chat-diff-chevron";
    chevron.innerHTML = '<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="3,4.5 6,7.5 9,4.5"/></svg>';
    header.appendChild(chevron);

    header.addEventListener("click", function () {
      card.classList.toggle("collapsed");
    });
    card.appendChild(header);

    var body = document.createElement("div");
    body.className = "chat-diff-body";

    var statsLine = document.createElement("div");
    statsLine.className = "chat-diff-stats-line";
    statsLine.innerHTML =
      '<span class="upd">' + updateResult.stats.updated + ' updated</span> \u00B7 ' +
      '<span class="try">' + updateResult.stats.try + ' to verify</span> \u00B7 ' +
      '<span class="fail">' + updateResult.stats.failed + ' failed</span> \u00B7 ' +
      '<span class="skip">' + updateResult.stats.skipped + ' skipped</span>';
    body.appendChild(statsLine);

    var dlBtn = document.createElement("button");
    dlBtn.type = "button";
    dlBtn.className = "chat-diff-download-link";
    dlBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="7" y1="1" x2="7" y2="9"/><polyline points="3,6 7,10 11,6"/><line x1="2" y1="13" x2="12" y2="13"/></svg>Download ' + scriptName;
    dlBtn.addEventListener("click", function () { downloadText(scriptName, updateResult.text); });
    body.appendChild(dlBtn);

    card.appendChild(body);
    return card;
  }


  function buildMethodsListEntry(label, offset) {
    var row = document.createElement("div");
    row.className = "chat-methods-row";

    var nameEl = document.createElement("span");
    nameEl.className = "chat-methods-name";
    nameEl.textContent = label;
    row.appendChild(nameEl);

    var copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "chat-offset-inline-copy";
    copyBtn.title = "Copy offset";
    copyBtn.innerHTML = '<span>' + offset + '</span><svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="4.5" y="4.5" width="8" height="8" rx="1"/><path d="M2.5 9.5h-1v-8a1 1 0 011-1h8v1"/></svg>';
    copyBtn.addEventListener("click", function () { copyText(offset, copyBtn); });
    row.appendChild(copyBtn);

    return row;
  }

  function buildMethodsListBody(listResult) {
    var wrap = document.createElement("div");
    wrap.className = "chat-methods-list";

    var source = document.createElement("div");
    source.className = "chat-offset-source";
    source.textContent = "From " + (listResult.source === "new" ? "NEW" : "OLD") + " dump.cs \u00B7 `" + listResult.className + "`";
    wrap.appendChild(source);

    if (listResult.methods.length) {
      var mHead = document.createElement("div");
      mHead.className = "chat-methods-heading";
      mHead.textContent = "Methods (" + listResult.methods.length + ")";
      wrap.appendChild(mHead);
      listResult.methods.forEach(function (m) {
        wrap.appendChild(buildMethodsListEntry(m.signature, m.offset));
      });
    }

    if (listResult.fields.length) {
      var fHead = document.createElement("div");
      fHead.className = "chat-methods-heading";
      fHead.textContent = "Fields (" + listResult.fields.length + ")";
      wrap.appendChild(fHead);
      listResult.fields.forEach(function (f) {
        wrap.appendChild(buildMethodsListEntry(f.name, f.offset));
      });
    }

    return wrap;
  }

  function addMessage(role, text, isError, best, updateResult, scriptName, attachmentName) {
    if (emptyEl) { emptyEl.style.display = "none"; }
    var msg = document.createElement("div");
    msg.className = "chat-msg " + role + (isError ? " error" : "");

    var roleEl = document.createElement("div");
    roleEl.className = "chat-msg-role";
    roleEl.textContent = role === "user" ? "YOU" : "GROQ";
    msg.appendChild(roleEl);

    var bubble = document.createElement("div");
    bubble.className = "chat-bubble";

    if (role === "user" && attachmentName) {
      var attChip = document.createElement("div");
      attChip.className = "chat-msg-attachment";
      var attTag = document.createElement("span");
      attTag.className = "chat-msg-attachment-tag";
      attTag.textContent = "SCRIPT";
      var attName = document.createElement("span");
      attName.className = "chat-msg-attachment-name";
      attName.textContent = attachmentName;
      attChip.appendChild(attTag);
      attChip.appendChild(attName);
      bubble.appendChild(attChip);
    }

    if (role === "ai" && updateResult && !isError) {
      bubble.appendChild(buildUpdateCard(updateResult, scriptName));
    } else if (role === "ai" && best && !isError) {
      bubble.appendChild(buildOffsetCard(best));
    }

    var body = document.createElement("div");
    body.className = "chat-bubble-body";
    if (role === "ai" && !isError) {
      renderFormattedBody(body, text);
    } else {
      body.textContent = text;
    }
    bubble.appendChild(body);

    msg.appendChild(bubble);
    thread.appendChild(msg);
    scrollToBottom();
    return msg;
  }


  function addStreamingMessage(best) {
    if (emptyEl) { emptyEl.style.display = "none"; }
    var msg = document.createElement("div");
    msg.className = "chat-msg ai streaming";

    var roleEl = document.createElement("div");
    roleEl.className = "chat-msg-role";
    roleEl.textContent = "GROQ";
    msg.appendChild(roleEl);

    var bubble = document.createElement("div");
    bubble.className = "chat-bubble";

    var cardSlot = document.createElement("div");
    bubble.appendChild(cardSlot);

    var body = document.createElement("div");
    body.className = "chat-bubble-body";
    var cursor = document.createElement("span");
    cursor.className = "chat-stream-cursor";
    body.appendChild(cursor);
    bubble.appendChild(body);

    var extraSlot = document.createElement("div");
    bubble.appendChild(extraSlot);

    msg.appendChild(bubble);
    thread.appendChild(msg);
    scrollToBottom();

    var raw = "";
    return {
      appendToken: function (text) {
        raw += text;
        body.innerHTML = "";
        renderFormattedBody(body, raw);
        body.appendChild(cursor);
        scrollToBottom();
      },
      finish: function () {
        msg.classList.remove("streaming");
        cursor.remove();
        if (best) { cardSlot.appendChild(buildOffsetCard(best)); }
        scrollToBottom();
        return raw;
      },
      
      finishWithExtra: function (extraEl, fallbackIntro) {
        msg.classList.remove("streaming");
        cursor.remove();
        if (!raw && fallbackIntro) {
          raw = fallbackIntro;
          renderFormattedBody(body, raw);
        }
        extraSlot.appendChild(extraEl);
        scrollToBottom();
        return raw;
      },
      fail: function (errText) {
        msg.classList.remove("streaming");
        msg.classList.add("error");
        cursor.remove();
        body.innerHTML = "";
        body.textContent = errText;
        scrollToBottom();
      }
    };
  }


  function streamGroqReply(payload, onToken, onDone, onError) {
    fetch("includes/groq-api.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        if (!r.ok || !r.body) {
          return r.json().catch(function () { return null; }).then(function (data) {
            throw new Error((data && data.error) ? data.error : "Something went wrong.");
          });
        }
        var reader = r.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";
        var full = "";
        var sawDone = false;
        var sawError = null;

        function pump() {
          return reader.read().then(function (res) {
            if (res.done) {
              if (sawError) { onError(sawError); }
              else if (sawDone || full) { onDone(full); }
              else { onError("Connection ended unexpectedly."); }
              return;
            }
            buffer += decoder.decode(res.value, { stream: true });

            var frames = buffer.split("\n\n");
            buffer = frames.pop(); // last (possibly incomplete) frame stays buffered

            frames.forEach(function (frame) {
              var eventType = "message";
              var dataStr = "";
              frame.split("\n").forEach(function (line) {
                if (line.indexOf("event:") === 0) eventType = line.slice(6).trim();
                else if (line.indexOf("data:") === 0) dataStr = line.slice(5).trim();
              });
              if (!dataStr) return;
              var data;
              try { data = JSON.parse(dataStr); } catch (e) { return; }

              if (eventType === "token" && data.text) {
                full += data.text;
                onToken(data.text);
              } else if (eventType === "error") {
                sawError = data.error || "Groq stream error.";
              } else if (eventType === "done") {
                sawDone = true;
              }
            });

            return pump();
          });
        }
        return pump();
      })
      .catch(function (err) {
        onError(err.message || "Network error.");
      });
  }

  function buildUpdateTraceSteps(events, scriptName, tag) {
    var parseLines = [], scanLines = [], applyLines = [];
    events.forEach(function (e) {
      var line = (e.type === "ok" ? "\u2713 " : e.type === "warn" ? "! " : e.type === "scan" ? "\u2026 " : "  ") + e.text;
      if (/^Parsing|^Indexed/.test(e.text)) parseLines.push(line);
      else if (/^Scanning/.test(e.text) || e.type === "scan") scanLines.push(line);
      else applyLines.push(line);
    });
    return [
      { title: "Parsing dump.cs", tag: "DUMP", icon: "file", code: capLines(parseLines, 12) },
      { title: "Scanning " + scriptName + " for offset tokens", tag: tag, icon: "file", code: capLines(scanLines.length ? scanLines : ["(no hex tokens to scan)"], 16) },
      { title: "Matching & applying offsets", tag: tag, icon: "terminal", code: capLines(applyLines.length ? applyLines : ["(nothing to apply)"], 16) }
    ];
  }

  function addRunningMessage(events, label, scriptName, tag) {
    if (emptyEl) { emptyEl.style.display = "none"; }
    var msg = document.createElement("div");
    msg.className = "chat-msg ai";

    var roleEl = document.createElement("div");
    roleEl.className = "chat-msg-role";
    roleEl.textContent = "GROQ";
    msg.appendChild(roleEl);

    var bubble = document.createElement("div");
    bubble.className = "chat-bubble";

    var run = buildToolTrace(buildUpdateTraceSteps(events, scriptName, tag), label);
    bubble.appendChild(run.el);

    msg.appendChild(bubble);
    thread.appendChild(msg);
    scrollToBottom();

    var playPromise = run.play();

    return {
      ready: playPromise,
      startExplanation: function (updateResult, scriptName) {
        if (updateResult) {
          bubble.appendChild(buildUpdateCard(updateResult, scriptName));
        }
        var body = document.createElement("div");
        body.className = "chat-bubble-body";
        var cursor = document.createElement("span");
        cursor.className = "chat-stream-cursor";
        body.appendChild(cursor);
        bubble.appendChild(body);
        scrollToBottom();

        var raw = "";
        return {
          appendToken: function (text) {
            raw += text;
            body.innerHTML = "";
            renderFormattedBody(body, raw);
            body.appendChild(cursor);
            scrollToBottom();
          },
          finish: function (fallbackIfEmpty, forceText) {
            cursor.remove();
            if (forceText) {
              raw = forceText;
              body.innerHTML = "";
              renderFormattedBody(body, raw);
            } else if (!raw && fallbackIfEmpty) {
              raw = fallbackIfEmpty;
              renderFormattedBody(body, raw);
            }
            scrollToBottom();
            return raw;
          }
        };
      },
      finishError: function (text) {
        var body = document.createElement("div");
        body.className = "chat-bubble-body";
        body.textContent = text;
        msg.classList.add("error");
        bubble.appendChild(body);
        scrollToBottom();
      }
    };
  }


  var SEARCH_HEADER_LABELS = [
    "Searched dump.cs",
    "Scanned dump.cs",
    "Looked up your query",
    "Cross-referenced dump.cs"
  ];

  function buildSearchTraceSteps(query, dumps, result, tag) {
    var fileLines = [];
    ["old", "new"].forEach(function (key) {
      var d = dumps[key];
      if (d && d.text) {
        fileLines.push((key === "new" ? "NEW" : "OLD") + " " + d.name + " \u2014 " + d.text.split(/\r?\n/).length + " lines loaded");
      }
    });
    if (!fileLines.length) fileLines.push("(no dump.cs loaded yet)");

    var matchLines = result.context
      ? result.context.split("\n\n")
      : ["(no matching lines found for \u201c" + query + "\u201d)"];

    var rankLines = (result.topMatches && result.topMatches.length)
      ? result.topMatches.map(function (m, i) {
          return "#" + (i + 1) + " [" + (m.key === "new" ? "NEW" : "OLD") + " L" + m.lineNo + ", score " + m.score + "] " + m.line;
        })
      : ["(nothing scored above 0)"];

    return [
      { title: "Reading dump.cs", tag: "FILE", icon: "file", code: capLines(fileLines, 6) },
      { title: "Searching \u201c" + (query.length > 40 ? query.slice(0, 40) + "\u2026" : query) + "\u201d", tag: tag, icon: "terminal", code: capLines(matchLines, 14) },
      { title: "Ranking candidates", tag: tag, icon: "terminal", code: capLines(rankLines, 8) }
    ];
  }

  function addRunningSearchMessage(query, result, tag) {
    if (emptyEl) { emptyEl.style.display = "none"; }
    var msg = document.createElement("div");
    msg.className = "chat-msg ai";

    var roleEl = document.createElement("div");
    roleEl.className = "chat-msg-role";
    roleEl.textContent = "GROQ";
    msg.appendChild(roleEl);

    var bubble = document.createElement("div");
    bubble.className = "chat-bubble";

    var headerLabel = SEARCH_HEADER_LABELS[Math.floor(Math.random() * SEARCH_HEADER_LABELS.length)];
    var run = buildToolTrace(buildSearchTraceSteps(query, dumps, result, tag), headerLabel);
    bubble.appendChild(run.el);

    var cardSlot = document.createElement("div");
    var body = document.createElement("div");
    body.className = "chat-bubble-body";
    var cursor = document.createElement("span");
    cursor.className = "chat-stream-cursor";

    msg.appendChild(bubble);
    thread.appendChild(msg);
    scrollToBottom();

    var playPromise = run.play();
    var raw = "";

    return {
      ready: playPromise,
      reveal: function (best) {
        msg.classList.add("streaming");
        bubble.appendChild(cardSlot);
        body.appendChild(cursor);
        bubble.appendChild(body);
        scrollToBottom();
        return {
          appendToken: function (text) {
            raw += text;
            body.innerHTML = "";
            renderFormattedBody(body, raw);
            body.appendChild(cursor);
            scrollToBottom();
          },
          finish: function () {
            msg.classList.remove("streaming");
            cursor.remove();
            if (best) { cardSlot.appendChild(buildOffsetCard(best)); }
            scrollToBottom();
            return raw;
          },
          fail: function (errText) {
            msg.classList.remove("streaming");
            msg.classList.add("error");
            cursor.remove();
            body.innerHTML = "";
            body.textContent = errText;
            scrollToBottom();
          }
        };
      }
    };
  }

  function addContextNote(matchCount) {
    var note = document.createElement("div");
    note.className = "chat-msg-context";
    note.style.alignSelf = "flex-end";
    note.textContent = matchCount > 0
      ? "found " + matchCount + " matching block(s) in your dump.cs"
      : "no matches found in loaded dump.cs";
    thread.appendChild(note);
  }

  // ── send flow ──
  function send() {
    var q = input.value.trim();
    if (!q) return;

    
    var showAttachment = scriptPendingDisplay && script ? script.name : null;
    if (showAttachment) {
      scriptPendingDisplay = false;
      chipRow.innerHTML = "";
      attachBtn.classList.remove("attached");
    }

    addMessage("user", q, false, null, null, null, showAttachment);
    history.push({ role: "user", text: q });

    
    var methodsClassName = mode !== "updator" ? matchMethodsCommand(q) : null;
    if (methodsClassName) {
      input.value = "";
      sendBtn.disabled = true;

      if (!dumps.old && !dumps.new) {
        addMessage("ai", "Attach your old and/or new dump.cs above first, then I can list `" + methodsClassName + "`'s methods and fields.", true);
        sendBtn.disabled = input.value.trim() === "";
        return;
      }

      var listResult = listClassMethods(methodsClassName);

      if (!listResult || (listResult.methods.length === 0 && listResult.fields.length === 0)) {
        addMessage("ai", "I couldn't find a class named `" + methodsClassName + "` in the loaded dump.cs. Double-check the spelling, or try a partial name.", true);
        sendBtn.disabled = input.value.trim() === "";
        return;
      }

      var methodsStream = addStreamingMessage(null);
      var listBody = buildMethodsListBody(listResult);

      var introContext = "The class \"" + listResult.className + "\" was found in the " + (listResult.source === "new" ? "NEW" : "OLD") + " dump.cs with "
        + listResult.methods.length + " method(s) and " + listResult.fields.length + " field(s). The full list is already being shown to the user separately by the tool, "
        + "so do NOT repeat the list yourself — just write one short, friendly lead-in sentence (no bullets) confirming what was found.";

      streamGroqReply(
        { message: "Briefly introduce the method/field list for this class in one short sentence.", context: introContext, history: [], dumpsLoaded: !!(dumps.old || dumps.new) },
        function onToken(text) { methodsStream.appendToken(text); },
        function onDone() {
          methodsStream.finishWithExtra(listBody);
          sendBtn.disabled = input.value.trim() === "";
        },
        function onError() {
          methodsStream.finishWithExtra(listBody, "Here's everything I found for `" + listResult.className + "`:");
          sendBtn.disabled = input.value.trim() === "";
        }
      );
      return;
    }


    var updateIntent = mode === "updator" || (mode === "finder" && isUpdateIntent(q));

    if (updateIntent && script && dumps.old && dumps.old.text && dumps.new && dumps.new.text) {
      input.value = "";
      sendBtn.disabled = true;

      var updateResult;
      try {
        updateResult = updateScript(true, false);
      } catch (err) {
        addMessage("ai", "Couldn't process the script: " + err.message, true);
        sendBtn.disabled = input.value.trim() === "";
        return;
      }

      var INTRO_LINES = [
        "I'll update the missing offsets in `" + script.name + "` using your old and new dump.cs.",
        "On it \u2014 I'll scan `" + script.name + "` and refresh every offset against the new dump.cs.",
        "I'll go through `" + script.name + "` now and match each old offset to its new value."
      ];
      addMessage("ai", INTRO_LINES[Math.floor(Math.random() * INTRO_LINES.length)]);

      var scriptExt = (script.name.split(".").pop() || "").toUpperCase();
      var RUN_LABELS_UPDATE = [
        "Updating " + script.name,
        "Refreshing " + script.name,
        "Syncing " + script.name + " offsets",
        "Re-matching " + script.name
      ];
      var runLabel = RUN_LABELS_UPDATE[Math.floor(Math.random() * RUN_LABELS_UPDATE.length)];
      var running = addRunningMessage(updateResult.events, runLabel, script.name, scriptExt || "SCRIPT");

      var total = updateResult.stats.updated + updateResult.stats.try + updateResult.stats.failed;
      var summaryContext = "The script \"" + script.name + "\" was just processed by the deterministic offset engine (not by you). "
        + "Results: " + updateResult.stats.updated + " updated, " + updateResult.stats.try + " marked TRY (verify manually), "
        + updateResult.stats.failed + " failed (no match found), " + updateResult.stats.skipped + " skipped (color hex). "
        + total + " total hex tokens were scanned in the script.";

      var bufferedTokens = [];
      var summaryDone = false;
      var summaryError = null;
      var summaryFull = "";

      streamGroqReply(
        {
          message: "Briefly summarize this script update result for the user in 2-4 bullet points. Mention if TRY or FAILED counts are non-zero and what the user should do about them.",
          context: summaryContext,
          history: [],
          dumpsLoaded: true
        },
        function onToken(text) { bufferedTokens.push(text); summaryFull += text; },
        function onDone() { summaryDone = true; },
        function onError(err) { summaryError = err; }
      );

      var fallbackText = "**Done** \u2014 `" + updateResult.stats.updated + "` updated, `" + updateResult.stats.try + "` to verify, `"
        + updateResult.stats.failed + "` failed, `" + updateResult.stats.skipped + "` skipped.";

      running.ready.then(function () {
   
        var streamBody = running.startExplanation(updateResult, script.name);

        function waitForMore() {
          if (bufferedTokens.length) {
            streamBody.appendToken(bufferedTokens.shift());
            setTimeout(waitForMore, 12);
            return;
          }
          if (summaryError) {
            streamBody.finish(null, fallbackText);
            history.push({ role: "ai", text: fallbackText });
            sendBtn.disabled = input.value.trim() === "";
            return;
          }
          if (summaryDone) {
            var finalText = streamBody.finish(summaryFull || fallbackText);
            history.push({ role: "ai", text: finalText });
            sendBtn.disabled = input.value.trim() === "";
            return;
          }
          setTimeout(waitForMore, 30);
        }
        waitForMore();
      });
      return;
    }

    if (updateIntent && (!script || !dumps.old || !dumps.old.text || !dumps.new || !dumps.new.text)) {
      var missing = [];
      if (!script) missing.push("a script file (.lua/.txt/.h/.py)");
      if (!dumps.old || !dumps.old.text) missing.push("the old dump.cs");
      if (!dumps.new || !dumps.new.text) missing.push("the new dump.cs");
      input.value = "";
      sendBtn.disabled = true;
      addMessage("ai", "To update your script I still need: " + missing.join(", ") + ". Tap the + button below to attach " + (missing.length > 1 ? "them" : "it") + ", then ask again.", true);
      sendBtn.disabled = input.value.trim() === "";
      return;
    }

    // ── normal ask-about-an-offset flow (Offset Finder + Analyze Offset) ──
    var result = searchDumps(q);
    if (dumps.old || dumps.new) addContextNote(result.matchCount);

    input.value = "";
    sendBtn.disabled = true;

    var searchTag = mode === "analyze" ? "ANALYZE" : "FINDER";
    var searchRun = addRunningSearchMessage(q, result, searchTag);

    searchRun.ready.then(function () {
      var streamMsg = searchRun.reveal(result.best);

      streamGroqReply(
        {
          message: q,
          context: result.context,
          history: history.slice(0, -1).slice(-10), // prior turns, capped
          dumpsLoaded: !!(dumps.old || dumps.new),
          mode: mode
        },
        function onToken(text) { streamMsg.appendToken(text); },
        function onDone(fullText) {
          var finalText = streamMsg.finish();
          history.push({ role: "ai", text: finalText || fullText });
          sendBtn.disabled = input.value.trim() === "";
        },
        function onError(errMsg) {
          streamMsg.fail(errMsg);
          sendBtn.disabled = input.value.trim() === "";
        }
      );
    });
  }

  input.addEventListener("input", function () {
    sendBtn.disabled = input.value.trim() === "";
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !sendBtn.disabled) send();
  });
  sendBtn.addEventListener("click", send);
})();
