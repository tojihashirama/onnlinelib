<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Astron Offset Updater v6</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
  <link rel="stylesheet" href="./style.css?v=2">
</head>

<body>
  <canvas id="particle-canvas"></canvas>

    <!-- HEADER -->
  <header class="header">
    <div class="header-left">
      <svg class="logo-icon" viewBox="0 0 22 22" fill="none">
        <rect x="1" y="1" width="20" height="20" rx="2" stroke="#00D97E" stroke-width="1.2" />
        <rect x="5" y="5" width="5" height="5" fill="#00D97E" opacity=".3" />
        <rect x="12" y="5" width="5" height="5" fill="#00D97E" opacity=".6" />
        <rect x="5" y="12" width="5" height="5" fill="#00D97E" opacity=".6" />
        <rect x="12" y="12" width="5" height="5" fill="#00D97E" />
      </svg>
      <span class="header-title">Offset Updater</span>
    </div>
    <div class="header-right">
      <a class="gemini-btn" href="ask.php" title="Ask Groq (Llama 3.1 8B) about an offset or class">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 1c.5 3.2 2.3 5 5.5 5.5C10.3 7 8.5 8.8 8 12c-.5-3.2-2.3-5-5.5-5.5C5.7 6 7.5 4.2 8 1z" fill="currentColor"/>
        </svg>
        GROQ
      </a>
      <div class="header-badge v6">
        <span class="badge-dot"></span>v6
      </div>
    </div>
  </header>

    <div class="layout">
    
    
    <div class="panel-section">
      <div class="section-label">Input Files</div>
      
      <div class="file-slot" id="slot-old">
        <svg class="slot-icon" viewBox="0 0 18 18">
          <rect x="2" y="1" width="11" height="14" rx="1" />
          <polyline points="10,1 10,5 14,5" />
          <line x1="5" y1="8" x2="11" y2="8" />
          <line x1="5" y1="11" x2="9" y2="11" />
        </svg>
        <div class="slot-info">
          <div class="slot-label" id="lbl-old">Old dump.cs</div>
          <div class="slot-name" id="name-old" style="display:none"></div>
          <div class="slot-size" id="size-old"></div>
        </div>
        <span class="slot-saved-tag" id="saved-tag-old"></span>
        <button class="slot-clear-btn" id="clear-btn-old" title="Clear saved dump">&#x2715;</button>
        <svg class="slot-check" viewBox="0 0 14 14">
          <polyline points="2,7 6,11 12,3" />
        </svg>
      </div>
      <input type="file" id="input-old" hidden>
      
      <div class="file-slot" id="slot-new">
        <svg class="slot-icon" viewBox="0 0 18 18">
          <rect x="2" y="1" width="11" height="14" rx="1" />
          <polyline points="10,1 10,5 14,5" />
          <line x1="5" y1="8" x2="11" y2="8" />
          <line x1="5" y1="11" x2="9" y2="11" />
        </svg>
        <div class="slot-info">
          <div class="slot-label" id="lbl-new">New dump.cs</div>
          <div class="slot-name" id="name-new" style="display:none"></div>
          <div class="slot-size" id="size-new"></div>
        </div>
        <span class="slot-saved-tag" id="saved-tag-new"></span>
        <button class="slot-clear-btn" id="clear-btn-new" title="Clear saved dump">&#x2715;</button>
        <svg class="slot-check" viewBox="0 0 14 14">
          <polyline points="2,7 6,11 12,3" />
        </svg>
      </div>
      <input type="file" id="input-new" hidden>
      
     
      <div class="file-slot" id="slot-zip" style="margin-bottom:0">
        <svg class="slot-icon" viewBox="0 0 18 18">
          <path d="M3 14V4a1 1 0 011-1h6l4 4v7a1 1 0 01-1 1H4a1 1 0 01-1-1z" />
          <polyline points="9,3 9,7 13,7" />
          <line x1="7" y1="7" x2="7" y2="14" stroke-dasharray="1.5 1.5" />
          <line x1="9" y1="7" x2="9" y2="14" stroke-dasharray="1.5 1.5" />
        </svg>
        <div class="slot-info">
          <div class="slot-label" id="lbl-zip">Script (.lua .cpp .txt .zip)</div>
          <div class="slot-name" id="name-zip" style="display:none"></div>
          <div class="slot-size" id="size-zip"></div>
        </div>
        <span class="slot-zip-badge" id="zip-badge" style="display:none">ZIP</span>
        <svg class="slot-check" viewBox="0 0 14 14">
          <polyline points="2,7 6,11 12,3" />
        </svg>
      </div>
      <input type="file" id="input-zip" accept=".lua,.cpp,.txt,.zip" hidden>
      
     
      <div id="zipPanel">
        <div class="zip-panel-inner">
          <div class="zip-panel-header">
            <span class="zip-panel-title"> Files inside ZIP</span>
            <span class="zip-panel-count" id="zipFileCount">0 files</span>
          </div>
          <div class="zip-file-list" id="zipFileList">
            <div class="zip-empty">No supported files found in ZIP.</div>
          </div>
          <button class="zip-use-btn" id="zipUseBtn" disabled onclick="useSelectedZipFile()">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
              <polyline points="2,7 6,11 12,3" />
            </svg>
            USE SELECTED FILE
          </button>
        </div>
      </div>
    </div>
    
    
    <div class="panel-section">
      <div class="section-label">Safety Options</div>
      <div class="safe-toggle-row">
        <div class="safe-toggle-label">
          Skip Color Palette Hex
          <span class="safe-toggle-sub">Ignore 3/6/8-digit color values</span>
          <span class="safe-toggle-value" id="val-color">FF6AA0</span>
        </div>
        <label class="ios-toggle">
          <input type="checkbox" id="tog-color" checked onchange="setSafeColor(this.checked)">
          <span class="ios-slider"></span>
        </label>
      </div>
      <div class="safe-toggle-row">
        <div class="safe-toggle-label">
          Skip If Not In Old Dump
          <span class="safe-toggle-sub">Only touch confirmed offsets</span>
          <span class="safe-toggle-value" id="val-strict">dump.cs</span>
        </div>
        <label class="ios-toggle">
          <input type="checkbox" id="tog-strict" onchange="setSafeStrict(this.checked)">
          <span class="ios-slider"></span>
        </label>
      </div>
    </div>
    
    
    <div class="panel-section">
      <div class="section-label">Output Filename</div>
      <div class="filename-wrap">
        <span class="filename-prefix">FILE</span>
        <input class="filename-input" id="filenameInput" type="text" placeholder="output" maxlength="64" spellcheck="false">
        <span class="filename-suffix">.lua</span>
      </div>
      <button class="btn btn-run" id="runBtn" onclick="run()">
        <svg class="btn-icon" viewBox="0 0 14 14">
          <polygon points="3,2 3,12 12,7" fill="currentColor" stroke="currentColor" />
        </svg>
        <span id="runLabel">RUN UPDATOR</span>
      </button>
      <button class="btn btn-dl" id="dlBtn" onclick="downloadFile()" disabled>
        <svg class="btn-icon" viewBox="0 0 14 14">
          <line x1="7" y1="1" x2="7" y2="9" />
          <polyline points="3,6 7,10 11,6" />
          <line x1="2" y1="13" x2="12" y2="13" />
        </svg>
        DOWNLOAD
      </button>
      <button class="btn btn-dl-offsets" id="dlOffsetsBtn" onclick="downloadOffsetsTxt()" disabled>
        <svg class="btn-icon" viewBox="0 0 14 14">
          <rect x="2" y="1" width="9" height="12" rx="1" />
          <line x1="4" y1="5" x2="9" y2="5" />
          <line x1="4" y1="7.5" x2="9" y2="7.5" />
          <line x1="4" y1="10" x2="7" y2="10" />
        </svg>
        DOWNLOAD OFFSET.TXT
      </button>
    </div>
    
    
    <div class="panel-section">
      <div class="progress-track">
        <div class="progress-fill" id="bar"></div>
      </div>

      <div class="scan-hero active" id="scanHero">
        <div class="scan-hero-track">
          <div class="scan-hero-horizon"></div>
          <svg class="scan-hero-figure t3" viewBox="0 0 64 42" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 30 C18 27, 28 19, 36 12 C31 19, 28 24, 41 21 C34 25, 32 30, 47 23" fill="none" stroke="#00D97E" stroke-width="3" stroke-linecap="round" opacity=".7"/>
            <circle cx="51" cy="17" r="5" fill="#00D97E"/>
          </svg>
          <svg class="scan-hero-figure t2" viewBox="0 0 64 42" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 30 C18 27, 28 19, 36 12 C31 19, 28 24, 41 21 C34 25, 32 30, 47 23" fill="none" stroke="#00D97E" stroke-width="3" stroke-linecap="round" opacity=".85"/>
            <circle cx="51" cy="17" r="5" fill="#00D97E"/>
          </svg>
          <svg class="scan-hero-figure" viewBox="0 0 64 42" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="capeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#4ad6ff" stop-opacity="0"/>
                <stop offset="100%" stop-color="#00D97E" stop-opacity=".95"/>
              </linearGradient>
              <filter id="heroGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="1.6" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path d="M3 30 C18 27, 28 19, 36 12 C31 19, 28 24, 41 21 C34 25, 32 30, 47 23" fill="none" stroke="url(#capeGrad)" stroke-width="3.4" stroke-linecap="round" filter="url(#heroGlow)"/>
            <circle cx="51" cy="17" r="4.4" fill="#eafff6" filter="url(#heroGlow)"/>
            <circle cx="51" cy="17" r="9" fill="#00D97E" opacity=".3"/>
          </svg>
          <span class="hero-spark" style="top:30%; left:60%; animation-delay:0s;">0x4A</span>
          <span class="hero-spark" style="top:55%; left:48%; animation-delay:.6s;">FF</span>
          <span class="hero-spark" style="top:18%; left:55%; animation-delay:1.2s;">RVA</span>
          <span class="hero-spark" style="top:65%; left:40%; animation-delay:1.8s;">0x1F</span>
        </div>
        <div class="scan-hero-caption">
          <span class="prompt">$</span><span id="heroCaption">scanning offsets at full speed</span><span class="cursor"></span>
        </div>
      </div>

      <div class="progress-meta">
        <span class="progress-status" id="statusText">READY</span>
        <span class="progress-time" id="timeText">—</span>
      </div>
      <div class="stats-grid">
        <div class="stat-cell">
          <div class="stat-val green" id="cntU">—</div>
          <div class="stat-lbl">UPDATED</div>
        </div>
        <div class="stat-cell">
          <div class="stat-val amber" id="cntT">—</div>
          <div class="stat-lbl">TRY</div>
        </div>
        <div class="stat-cell">
          <div class="stat-val red" id="cntF">—</div>
          <div class="stat-lbl">FAILED</div>
        </div>
        <div class="stat-cell">
          <div class="stat-val skip" id="cntS">—</div>
          <div class="stat-lbl">SKIPPED</div>
        </div>
      </div>
    </div>
    
   
    <div class="panel-right">
      <div class="term-titlebar">
        <span class="term-dot r"></span><span class="term-dot y"></span><span class="term-dot g"></span>
        <span class="term-titlebar-name">offset_log.sh</span>
        <span class="term-titlebar-status" id="termStatus"><span class="pulse-dot"></span>IDLE</span>
      </div>
      <div class="log-header">
        <span class="log-title">Output Log</span>
        <div class="log-filter">
          <button class="filter-btn f-all" id="fb-all" onclick="setFilter('all')">all</button>
          <button class="filter-btn" id="fb-updated" onclick="setFilter('updated')">updated</button>
          <button class="filter-btn" id="fb-try" onclick="setFilter('try')">try</button>
          <button class="filter-btn" id="fb-failed" onclick="setFilter('failed')">failed</button>
          <button class="filter-btn" id="fb-skipped" onclick="setFilter('skipped')">skipped</button>
        </div>
      </div>
      <div class="log-body" id="logBody">
        <div class="log-empty" id="logEmpty">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="4" width="24" height="24" rx="2" stroke="#263340" stroke-width="1.5" />
            <line x1="9" y1="12" x2="23" y2="12" stroke="#263340" stroke-width="1.5" />
            <line x1="9" y1="17" x2="20" y2="17" stroke="#263340" stroke-width="1.5" />
            <line x1="9" y1="22" x2="15" y2="22" stroke="#263340" stroke-width="1.5" />
          </svg>
          <span>LOAD FILES AND PRESS RUN<span class="cursor"></span></span>
        </div>
      </div>
    </div>
    
   
    <div class="panel-section">
      <div class="about-area">
        <div class="about-line">TG: <span>@shinken_meow</span></div>
        <div class="about-line">Format: <span>dump.cs RVA/Offset + Field Offsets + .ctor/.cctor</span></div>
        <div class="about-line">Version: <span>v6 — ZIP Extract Support + File Picker</span></div>
      </div>
    </div>
    
  </div><!-- end .layout -->

    <div class="modal-overlay" id="detailModal" onclick="closeModal(event)">
    <div class="modal-box" id="detailBox">
      <div class="modal-top">
        <span class="modal-title">Offset Detail</span>
        <div class="modal-close" onclick="closeModalForce()">✕</div>
      </div>
      <div id="detailContent"></div>
    </div>
  </div>
  
  <div class="toast" id="toast"></div>
  

  <script src="assets/js/app.js"></script>
</body>

</html>
