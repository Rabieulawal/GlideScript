<<<<<<< HEAD
import './style.css';
=======
>>>>>>> 5f0744358e4ff499b8e09d45ff83c6cdba8753a6
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { GlideScriptCompiler } from './compiler.js';

// ── Example source loaded on first visit ────────────────────────

const EXAMPLE_SOURCE = `// GlideScript Demo — Hello World
// Pages, boxes, buttons, and fluid layouts

pg.home [
  text = "Welcome to GlideScript"
  space.3

  Add.Box(colour = #e8f4f8, Size = 60 and 25, location = 20 and 18, edges = rounded, text = "This box scales fluidly with your viewport")

  space.30

  text = "Type your name below:"
  add.textbox(placeholder = "Enter your name", var = username)

  space.2
  add.botton(text = "About this app", click = open Pg.about, colour = #2d6a4f, edges = rounded)
  add.botton(text = "Dashboard", click = open Pg.dashboard, colour = #1a1a2e, edges = rounded)
]

pg.about [
  text = "About GlideScript"
  space.2
  text = "A declarative language for building web apps."
  text = "Write simple code — the compiler handles the rest."
  space.3

  Add.Box(colour = #fff3cd, Size = 50 and 15, location = 25 and 40, edges = rounded, text = "No HTML or CSS needed!")

  space.25
  add.botton(text = "Back to Home", click = open Pg.home, colour = #6c757d, edges = rounded)
]

pg.dashboard [
  text = "Dashboard"
  space.2
  text = "Three fluid boxes sitting side by side."
  space.2

  Add.Box(colour = #d4edda, Size = 25 and 20, location = 5 and 25, edges = rounded, text = "Stats")
  Add.Box(colour = #cce5ff, Size = 25 and 20, location = 35 and 25, edges = rounded, text = "Reports")
  Add.Box(colour = #f8d7da, Size = 25 and 20, location = 65 and 25, edges = rounded, text = "Settings")
]

pg.admin [
  pg.hide = true
  text = "Admin Panel — Hidden from nav"
  space.2
  text = "This page won't appear in the navigation bar."
]`;

// ── State ───────────────────────────────────────────────────────

const compiler = new GlideScriptCompiler();
let compileTimer = null;
let editor = null;
let currentFileName = 'untitled.gs';

// ── DOM references ──────────────────────────────────────────────

const editorContainer = document.getElementById('editor-container');
const previewFrame = document.getElementById('preview-frame');
const fileNameDisplay = document.getElementById('file-name');
const compileStatus = document.getElementById('compile-status');
const dropOverlay = document.getElementById('drop-overlay');
const toastContainer = document.getElementById('toast-container');

// ── Initialize CodeMirror ───────────────────────────────────────

function initEditor() {
  const startState = EditorState.create({
    doc: EXAMPLE_SOURCE,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      javascript(),
      oneDark,
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          scheduleCompile();
        }
      }),
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { overflow: 'auto' },
      }),
    ],
  });

  editor = new EditorView({
    state: startState,
    parent: editorContainer,
  });

  // Initial compile
  doCompile();
}

// ── Compile ─────────────────────────────────────────────────────

function scheduleCompile() {
  clearTimeout(compileTimer);
  compileTimer = setTimeout(doCompile, 400);
}

function doCompile() {
  const source = editor.state.doc.toString();

  if (!source.trim()) {
    setStatus('empty', '');
    previewFrame.srcdoc = '<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#999;"><p>Write some GlideScript to see a preview…</p></body></html>';
    return;
  }

  try {
    const html = compiler.compile(source);
    previewFrame.srcdoc = html;
    setStatus('success', 'Compiled');
  } catch (err) {
    setStatus('error', 'Error');
    showToast(`Compile error: ${err.message}`, 'error');
    console.error('GlideScript compile error:', err);
  }
}

function setStatus(type, label) {
  compileStatus.className = 'panel-status ' + type;
  compileStatus.textContent = label;
}

// ── File drop ───────────────────────────────────────────────────

let dragCounter = 0;

document.addEventListener('dragenter', e => {
  e.preventDefault();
  dragCounter++;
  if (dragCounter === 1) {
    dropOverlay.classList.add('visible');
  }
});

document.addEventListener('dragleave', e => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dropOverlay.classList.remove('visible');
  }
});

document.addEventListener('dragover', e => {
  e.preventDefault();
});

document.addEventListener('drop', e => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.classList.remove('visible');

  const file = e.dataTransfer.files[0];
  if (!file) return;

  if (!file.name.endsWith('.gs')) {
    showToast('Please drop a .gs file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    currentFileName = file.name;
    fileNameDisplay.textContent = currentFileName;

    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: reader.result },
    });
    doCompile();
    showToast(`Loaded ${file.name}`, 'success');
  };
  reader.readAsText(file);
});

// ── Toolbar actions ─────────────────────────────────────────────

// Compile button
document.getElementById('btn-compile').addEventListener('click', doCompile);

// Download HTML
document.getElementById('btn-download').addEventListener('click', () => {
  const source = editor.state.doc.toString();
  if (!source.trim()) {
    showToast('Nothing to export', 'error');
    return;
  }

  try {
    const html = compiler.compile(source);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFileName.replace('.gs', '.html');
    a.click();
    URL.revokeObjectURL(url);
    showToast('HTML exported', 'success');
  } catch (err) {
    showToast(`Export error: ${err.message}`, 'error');
  }
});

// Open file
document.getElementById('btn-open').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.gs';
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      currentFileName = file.name;
      fileNameDisplay.textContent = currentFileName;
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: reader.result },
      });
      doCompile();
      showToast(`Opened ${file.name}`, 'success');
    };
    reader.readAsText(file);
  };
  input.click();
});

// ── Resize handle ───────────────────────────────────────────────

const resizeHandle = document.getElementById('resize-handle');
const editorPanel = document.querySelector('.editor-panel');

let isResizing = false;

resizeHandle.addEventListener('mousedown', e => {
  isResizing = true;
  resizeHandle.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});

document.addEventListener('mousemove', e => {
  if (!isResizing) return;
  const percent = (e.clientX / window.innerWidth) * 100;
  const clamped = Math.min(Math.max(percent, 25), 75);
  editorPanel.style.width = clamped + '%';
});

document.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    resizeHandle.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// ── Documentation Panel Logic ───────────────────────────────────

const tabPreview = document.getElementById('tab-preview');
const tabDocs = document.getElementById('tab-docs');
const docsPanel = document.getElementById('docs-panel');

tabPreview.addEventListener('click', () => {
  tabPreview.classList.add('active');
  tabDocs.classList.remove('active');
  previewFrame.style.display = 'block';
  docsPanel.style.display = 'none';
});

tabDocs.addEventListener('click', () => {
  tabDocs.classList.add('active');
  tabPreview.classList.remove('active');
  previewFrame.style.display = 'none';
  docsPanel.style.display = 'flex';
});

// Sidebar links navigation inside docs-content
const docsNavLinks = document.querySelectorAll('.docs-nav-link');
const docsContent = document.querySelector('.docs-content');

docsNavLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = link.getAttribute('href').substring(1);
    const targetEl = document.getElementById(targetId);
    if (targetEl && docsContent) {
      const targetOffset = targetEl.offsetTop;
      docsContent.scrollTo({
        top: targetOffset - 16,
        behavior: 'smooth'
      });

      docsNavLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    }
  });
});

// Highlight sidebar links during scroll (scroll-spy)
if (docsContent) {
  docsContent.addEventListener('scroll', () => {
    let currentSection = '';
    const sections = docsContent.querySelectorAll('.doc-section');
    sections.forEach(sec => {
      const secTop = sec.offsetTop;
      if (docsContent.scrollTop >= secTop - 60) {
        currentSection = sec.getAttribute('id');
      }
    });

    if (currentSection) {
      docsNavLinks.forEach(link => {
        if (link.getAttribute('href') === `#${currentSection}`) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }
  });
}

// Copy Code blocks
window.copyCode = function(button) {
  const codeBlock = button.closest('.code-block-wrapper').querySelector('code');
  if (codeBlock) {
    navigator.clipboard.writeText(codeBlock.innerText.trim()).then(() => {
      button.textContent = 'Copied!';
      button.classList.add('success');
      showToast('Code copied to clipboard', 'success');
      setTimeout(() => {
        button.textContent = 'Copy';
        button.classList.remove('success');
      }, 2000);
    });
  }
};

// Load code examples into the compiler
window.loadExample = function(button) {
  const codeBlock = button.closest('.code-block-wrapper').querySelector('code');
  if (codeBlock && editor) {
    const rawCode = codeBlock.innerText.trim();
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: rawCode }
    });
    tabPreview.click();
    showToast('Example loaded into editor!', 'success');
  }
};

// ── Toast ───────────────────────────────────────────────────────

function showToast(message, type = '') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

// ── Boot ────────────────────────────────────────────────────────

initEditor();
