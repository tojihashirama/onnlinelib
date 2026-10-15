<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Groq — ASTRON Offset Updater</title>
  <link rel="stylesheet" href="assets/css/style.css">
</head>

<body class="ask-page">

  <header class="header">
    <div class="header-left">
      <a class="chat-back" href="index.php">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6">
          <polyline points="8.5,2 3,7 8.5,12" />
        </svg>
        BACK
      </a>
    </div>
    <div class="header-badge" style="border-color:var(--accent2); color:var(--accent2);">
      <span class="badge-dot" style="background:var(--accent2);"></span>GROQ
    </div>
  </header>

  <div class="chat-wrap">

    <div class="chat-mode-row" id="chatModeRow">
      <button class="chat-mode-btn active" id="modeFinder" data-mode="finder" type="button">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="6" cy="6" r="4.2" />
          <line x1="9.2" y1="9.2" x2="12.5" y2="12.5" stroke-linecap="round" />
        </svg>
        Offset Finder
      </button>
      <button class="chat-mode-btn" id="modeUpdator" data-mode="updator" type="button">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 7a5 5 0 0 1 8.5-3.5L12 2" />
          <path d="M12 2v3h-3" />
          <path d="M12 7a5 5 0 0 1-8.5 3.5L2 12" />
          <path d="M2 12v-3h3" />
        </svg>
        Offset Updator
      </button>
      <button class="chat-mode-btn" id="modeAnalyze" data-mode="analyze" type="button">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <path d="M2 11.5h10" />
          <path d="M3.5 11.5V7l2-2 2 2.5 3-4.5v8.5" />
        </svg>
        Analyze Offset
      </button>
    </div>
    <div class="chat-mode-hint" id="chatModeHint">Search loaded dump.cs for an exact offset or class/field name.</div>

    <div class="chat-upload-row">
      <div class="chat-upload-slot" id="chatSlotOld">
        <span class="chat-upload-plus" id="chatPlusOld">+</span>
        <div class="chat-upload-text">
          <div class="chat-upload-label" id="chatLabelOld">Old dump.cs</div>
          <div class="chat-upload-name" id="chatNameOld"></div>
        </div>
      </div>
      <input type="file" id="chatFileOld" accept=".cs,.txt" hidden>

      <div class="chat-upload-slot" id="chatSlotNew">
        <span class="chat-upload-plus" id="chatPlusNew">+</span>
        <div class="chat-upload-text">
          <div class="chat-upload-label" id="chatLabelNew">New dump.cs</div>
          <div class="chat-upload-name" id="chatNameNew"></div>
        </div>
      </div>
      <input type="file" id="chatFileNew" accept=".cs,.txt" hidden>
    </div>

    <div class="chat-thread" id="chatThread">
      <div class="chat-empty" id="chatEmpty">
        <svg width="30" height="30" viewBox="0 0 16 16" fill="none">
          <path d="M8 1c.5 3.2 2.3 5 5.5 5.5C10.3 7 8.5 8.8 8 12c-.5-3.2-2.3-5-5.5-5.5C5.7 6 7.5 4.2 8 1z" fill="#4ad6ff" />
        </svg>
        <div>ASK ABOUT AN OFFSET OR CLASS</div>
        <div class="chat-empty-hint">Type something like <b>0x123456</b> or a class name like <b>Player.TakeDamage</b>. Attach your old/new dump.cs above so Groq (Llama 3.1 8B) can search it for you. Try <b>/methods Player</b> to list everything a class exposes. Tap <b>+</b> below to attach a <b>script</b> (.lua/.txt/.h/.py) and just say <b>"update this"</b> to get its offsets refreshed and ready to download.</div>
      </div>
    </div>

    <div class="chat-composer">
      <div class="chat-chip-row" id="chatChipRow"></div>

      <div class="chat-composer-bar">
        <button class="chat-attach-btn" id="chatAttachBtn" type="button" title="Attach a script">
          <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
        </button>
        <input type="file" id="chatFileScript" accept=".lua,.txt,.h,.py" hidden>

        <div class="chat-input-wrap">
          <input class="chat-input" id="chatInput" type="text" placeholder="0x123456, ClassName.Method, or 'update this'" autocomplete="off" spellcheck="false">
        </div>
        <button class="chat-send-btn" id="chatSendBtn" disabled>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M2 8l12-6-4 6 4 6-12-6z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>

  </div>

  <script src="assets/js/ask.js"></script>
</body>

</html>
