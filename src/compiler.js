/**
 * GlideScript Compiler
 * Parses .gs source files and generates standalone HTML/CSS/JS output.
 */

export class GlideScriptCompiler {
  constructor() {
    this.pages = new Map();
    this.hiddenPages = new Set();
    this.variables = new Map(); // var name -> element bindings
  }

  /**
   * Main entry point — compile raw .gs source to HTML string.
   */
  compile(raw) {
    this.pages.clear();
    this.hiddenPages.clear();
    this.variables.clear();

    const cleaned = this.cleanSource(raw);
    this.extractPages(cleaned);

    const parsedPages = new Map();
    let bindCounter = 0;

    for (const [name, content] of this.pages) {
      const elements = this.parseElements(content);
      const processedElements = [];
      let pendingBindingVar = null;

      for (const el of elements) {
        if (el.type === 'when_binding') {
          pendingBindingVar = el.varName;
          continue;
        }

        if (pendingBindingVar) {
          const bindId = `bind-${name}-${pendingBindingVar}-${++bindCounter}`;
          el.bindId = bindId;

          if (!this.variables.has(pendingBindingVar)) {
            this.variables.set(pendingBindingVar, []);
          }
          this.variables.get(pendingBindingVar).push(bindId);

          pendingBindingVar = null;
        }

        processedElements.push(el);
      }

      parsedPages.set(name, processedElements);
    }

    return this.generateHTML(parsedPages);
  }

  // ── Step 1: Clean source ──────────────────────────────────────────

  cleanSource(raw) {
    return raw
      .split('\n')
      .map(line => line.replace(/\/\/.*/, '')) // strip comments
      .filter(line => line.trim().length > 0)  // remove blank lines
      .join('\n');
  }

  // ── Step 2: Extract page blocks ───────────────────────────────────

  extractPages(cleaned) {
    const pageRegex = /pg\.(\w+)\s*\[([\s\S]*?)\]/gi;
    let match;

    while ((match = pageRegex.exec(cleaned)) !== null) {
      const pageName = match[1].toLowerCase();
      const innerContent = match[2];

      // Check for pg.hide = true inside the block
      if (/pg\.hide\s*=\s*true/i.test(innerContent)) {
        this.hiddenPages.add(pageName);
      }

      this.pages.set(pageName, innerContent);
    }
  }

  // ── Step 3: Parse elements within a page ──────────────────────────

  parseElements(content) {
    const elements = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Skip pg.hide directives
      if (/^pg\.hide\s*=\s*true$/i.test(line)) continue;

      // Text element: text = "..."
      const textMatch = line.match(/^text\s*=\s*"([^"]*)"/i);
      if (textMatch) {
        elements.push({ type: 'text', value: textMatch[1] });
        continue;
      }

      // Space element: space.N
      const spaceMatch = line.match(/^space\.(\d+)/i);
      if (spaceMatch) {
        elements.push({ type: 'space', value: parseInt(spaceMatch[1]) });
        continue;
      }

      // Variable binding: when var.X has value
      const whenMatch = line.match(/^when\s+var\.(\w+)\s+has\s+value/i);
      if (whenMatch) {
        elements.push({ type: 'when_binding', varName: whenMatch[1].toLowerCase() });
        continue;
      }

      // Component blocks: Add.Box(...), add.botton(...), add.button(...), add.textbox(...), add.image(...)
      const componentMatch = line.match(/^add\.(\w+)\s*\(([\s\S]*?)\)/i);
      if (componentMatch) {
        const componentType = componentMatch[1].toLowerCase();
        const argsStr = componentMatch[2];
        const args = this.parseArgs(argsStr);

        // Normalize "botton" typo to "button"
        const normalizedType = componentType === 'botton' ? 'button' : componentType;

        elements.push({ type: 'component', componentType: normalizedType, args });
        continue;
      }
    }

    return elements;
  }

  // ── Argument parser ───────────────────────────────────────────────

  parseArgs(argsStr) {
    const args = {};
    // Split on commas, but be careful with "X and Y" values
    const pairs = argsStr.split(',');

    for (const pair of pairs) {
      const eqIndex = pair.indexOf('=');
      if (eqIndex === -1) continue;

      const key = pair.substring(0, eqIndex).trim().toLowerCase();
      let value = pair.substring(eqIndex + 1).trim();

      // Strip quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }

      // Check for "X and Y" pattern (dimension pairs)
      const andMatch = value.match(/^(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)$/i);
      if (andMatch) {
        args[key] = [parseFloat(andMatch[1]), parseFloat(andMatch[2])];
      } else {
        args[key] = value;
      }
    }

    return args;
  }

  // ── Step 4: Generate HTML ─────────────────────────────────────────

  generateHTML(parsedPages) {
    const pageNames = [...parsedPages.keys()];
    const visiblePages = pageNames.filter(n => !this.hiddenPages.has(n));

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GlideScript App</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: #f5f5f5;
      color: #1a1a1a;
      min-height: 100vh;
    }

    .gs-nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 6vh;
      background: #1a1a2e;
      display: flex;
      align-items: center;
      padding: 0 3vw;
      gap: 2vw;
      z-index: 1000;
    }

    .gs-nav button {
      background: none;
      border: none;
      color: #a0a0c0;
      font-size: 1.6vh;
      cursor: pointer;
      padding: 1vh 1.5vw;
      border-radius: 4px;
      transition: all 0.2s ease;
      text-transform: capitalize;
      font-weight: 500;
      letter-spacing: 0.03em;
    }

    .gs-nav button:hover {
      color: #ffffff;
      background: rgba(255,255,255,0.08);
    }

    .gs-nav button.active-link {
      color: #ffffff;
      background: rgba(255,255,255,0.12);
    }

    .gs-page {
      display: none;
      padding-top: 8vh;
      min-height: 100vh;
      position: relative;
    }

    .gs-page.active {
      display: block;
    }

    .gs-text {
      padding: 1vh 3vw;
      font-size: 2vh;
      line-height: 1.6;
    }

    .gs-box {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2vh 3vw;
      margin: 1vh 3vw;
      font-size: 1.8vh;
      line-height: 1.5;
      text-align: center;
      box-sizing: border-box;
      overflow: auto;
    }

    .gs-button {
      display: inline-block;
      padding: 1.2vh 2.5vw;
      margin: 1vh 3vw;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1.8vh;
      font-weight: 500;
      background: #1a1a2e;
      color: #ffffff;
      transition: all 0.2s ease;
    }

    .gs-button:hover {
      opacity: 0.85;
      transform: translateY(-1px);
    }

    .gs-textbox {
      display: block;
      margin: 1vh 3vw;
      padding: 1.2vh 1.5vw;
      font-size: 1.8vh;
      border: 2px solid #ddd;
      border-radius: 6px;
      outline: none;
      transition: border-color 0.2s ease;
      background: #fff;
    }

    .gs-textbox:focus {
      border-color: #1a1a2e;
    }

    .gs-image {
      display: block;
      margin: 1vh 3vw;
      max-width: 90vw;
    }
  </style>
</head>
<body>
`;

    // Navigation bar (skip hidden pages)
    if (visiblePages.length > 1) {
      html += `  <nav class="gs-nav">\n`;
      for (const name of visiblePages) {
        const isFirst = name === visiblePages[0];
        html += `    <button onclick="showPage('${name}')" id="nav-${name}"${isFirst ? ' class="active-link"' : ''}>${name}</button>\n`;
      }
      html += `  </nav>\n\n`;
    }

    // Page containers
    for (const [name, elements] of parsedPages) {
      const isFirst = name === pageNames[0];
      html += `  <div id="page-${name}" class="gs-page${isFirst ? ' active' : ''}">\n`;

      for (const el of elements) {
        html += this.renderElement(el, name);
      }

      html += `  </div>\n\n`;
    }

    // Router script
    html += `  <script>
    function showPage(id) {
      // Hide all pages
      document.querySelectorAll('.gs-page').forEach(p => {
        p.classList.remove('active');
      });
      // Deactivate all nav links
      document.querySelectorAll('.gs-nav button').forEach(b => {
        b.classList.remove('active-link');
      });
      // Show target page
      const target = document.getElementById('page-' + id);
      if (target) target.classList.add('active');
      // Activate nav link
      const navBtn = document.getElementById('nav-' + id);
      if (navBtn) navBtn.classList.add('active-link');
    }
`;

    // Variable bindings
    if (this.variables.size > 0) {
      html += `\n    // Variable bindings\n`;
      html += `    document.addEventListener('DOMContentLoaded', function() {\n`;
      for (const [varName, bindings] of this.variables) {
        html += `      var input_${varName} = document.getElementById('var-${varName}');\n`;
        html += `      if (input_${varName}) {\n`;
        html += `        input_${varName}.addEventListener('input', function() {\n`;
        html += `          var val = this.value;\n`;
        for (const bindId of bindings) {
          html += `          var el = document.getElementById('${bindId}');\n`;
          html += `          if (el) el.textContent = val;\n`;
        }
        html += `        });\n`;
        html += `      }\n`;
      }
      html += `    });\n`;
    }

    html += `  </script>\n</body>\n</html>`;

    return html;
  }

  // ── Element renderer ──────────────────────────────────────────────

  renderElement(el, pageName) {
    switch (el.type) {
      case 'text': {
        const idAttr = el.bindId ? ` id="${el.bindId}"` : '';
        return `    <p class="gs-text"${idAttr}>${this.escapeHTML(el.value)}</p>\n`;
      }

      case 'space':
        return `    <div style="height: ${el.value}vh;"></div>\n`;

      case 'component':
        return this.renderComponent(el, pageName);

      default:
        return '';
    }
  }

  renderComponent(el, pageName) {
    const { componentType, args } = el;
    const styles = [];
    let extraAttrs = '';
    let innerText = '';

    // Process common style args
    if (args.colour || args.color) {
      const color = args.colour || args.color;
      styles.push(`background-color: ${color}`);
    }

    if (args['text-colour'] || args['text-color'] || args.textcolour || args.textcolor) {
      const tc = args['text-colour'] || args['text-color'] || args.textcolour || args.textcolor;
      styles.push(`color: ${tc}`);
    }

    if (args.size) {
      if (Array.isArray(args.size)) {
        styles.push(`width: ${args.size[0]}vw`);
        styles.push(`height: ${args.size[1]}vh`);
      } else {
        styles.push(`width: ${args.size}vw`);
      }
    }

    if (args.location) {
      if (Array.isArray(args.location)) {
        styles.push(`position: absolute`);
        styles.push(`left: ${args.location[0]}vw`);
        styles.push(`top: ${args.location[1]}vh`);
      }
    }

    if (args.edges === 'rounded') {
      styles.push(`border-radius: 12px`);
    }

    if (args['font-size'] || args.fontsize) {
      const fs = args['font-size'] || args.fontsize;
      styles.push(`font-size: ${fs}vh`);
    }

    if (args.opacity) {
      styles.push(`opacity: ${args.opacity}`);
    }

    if (args.border) {
      styles.push(`border: ${args.border}`);
    }

    const styleStr = styles.length > 0 ? ` style="${styles.join('; ')};"` : '';

    switch (componentType) {
      case 'box': {
        let boxContent = '';
        if (args.text) {
          boxContent = this.escapeHTML(args.text);
        }
        const idAttr = el.bindId ? ` id="${el.bindId}"` : '';
        return `    <div class="gs-box"${idAttr}${styleStr}>${boxContent}</div>\n`;
      }

      case 'button': {
        innerText = args.text || 'Button';
        let onclick = '';

        if (args.click) {
          // Parse "open Pg.X"
          const openMatch = String(args.click).match(/open\s+pg\.(\w+)/i);
          if (openMatch) {
            onclick = ` onclick="showPage('${openMatch[1].toLowerCase()}')"`;
          }
        }

        const idAttr = el.bindId ? ` id="${el.bindId}"` : '';
        return `    <button class="gs-button"${idAttr}${styleStr}${onclick}>${this.escapeHTML(innerText)}</button>\n`;
      }

      case 'textbox': {
        const placeholder = args.placeholder || '';
        const varName = args.var ? args.var.toLowerCase() : '';
        const idAttr = varName ? ` id="var-${varName}"` : '';

        // Track variables for binding
        if (varName) {
          if (!this.variables.has(varName)) {
            this.variables.set(varName, []);
          }
        }

        return `    <input type="text" class="gs-textbox"${idAttr} placeholder="${this.escapeHTML(placeholder)}"${styleStr}>\n`;
      }

      case 'image': {
        const src = args.src || args.source || '';
        const alt = args.alt || 'image';
        let imgStyles = styles.join('; ');
        if (imgStyles) imgStyles = ` style="${imgStyles};"`;
        const idAttr = el.bindId ? ` id="${el.bindId}"` : '';
        return `    <img class="gs-image"${idAttr} src="${this.escapeHTML(src)}" alt="${this.escapeHTML(alt)}"${imgStyles}>\n`;
      }

      default:
        return `    <!-- Unknown component: ${componentType} -->\n`;
    }
  }

  escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
