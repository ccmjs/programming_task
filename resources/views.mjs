/** All task text, test names, compiler messages and output are rendered as text. */
export function main(app) {
  return app.ui.html`
    <section class="programming-task">
      <header>
        <p class="eyebrow">Java ${app.javaVersion} · Selbstkontrolle</p>
        <h1>${app.title}</h1>
        <div class="assignment">${app.task}</div>
      </header>
      <div class="editor-slot">${app.editor.host}</div>
      <nav class="actions" aria-label="Lösung prüfen">
        <button class="primary" type="button" data-on-click="check">Lösung prüfen</button>
        <button type="button" data-on-click="reset">Startcode wiederherstellen</button>
        <button type="button" data-on-click="cancel" hidden>Abbrechen</button>
      </nav>
      <div class="feedback" aria-live="polite" aria-atomic="true"></div>
    </section>
  `;
}

export function feedback(app) {
  const { phase, message, result } = app.state;
  if (phase === "idle") return app.ui.html`<p class="notice">${message || "Bearbeite den Code und prüfe deine Lösung."}</p>`;
  if (phase === "checking") return app.ui.html`<p class="notice checking"><span class="spinner" aria-hidden="true"></span>Die Lösung wird geprüft …</p>`;
  if (phase === "error") return app.ui.html`<div class="result error"><h2>Prüfung nicht möglich</h2><p>${message}</p></div>`;

  const titles = { passed: "Prüfung bestanden", failed: "Noch nicht alle Tests bestanden",
    compile_error: "Der Code konnte nicht kompiliert werden", error: "Fehler bei der Ausführung" };
  const labels = { passed: "Bestanden", failed: "Fehlgeschlagen", skipped: "Übersprungen" };
  const severityLabels = { error: "Fehler", warning: "Warnung", info: "Hinweis", hint: "Hinweis" };
  const count = status => result.tests.filter(item => item.status === status).length;
  return app.ui.html`
    <section class="result ${result.status}">
      <h2>${titles[result.status]}</h2>
      ${result.message && app.ui.html`<p class="message">${result.message}</p>`}
      ${result.tests.length > 0 && app.ui.html`
        <p class="summary">${count("passed")} bestanden · ${count("failed")} fehlgeschlagen · ${count("skipped")} übersprungen</p>
        <ul class="test-results">
          ${result.tests.map(item => app.ui.html`
            <li class="test-result ${item.status}">
              <div class="test-heading"><strong>${item.name}</strong><span class="badge">${labels[item.status]}</span></div>
              ${item.message && app.ui.html`<pre>${item.message}</pre>`}
            </li>
          `)}
        </ul>
      `}
      ${result.diagnostics.length > 0 && app.ui.html`
        <h3>Meldungen des Compilers</h3>
        <ul class="diagnostics">
          ${result.diagnostics.map(item => app.ui.html`
            <li><strong>${severityLabels[item.severity]} · ${item.file || app.fileName}, Zeile ${item.line}${item.column ? `:${item.column}` : ""}</strong><p>${item.message}</p></li>
          `)}
        </ul>
      `}
      ${result.stdout && app.ui.html`<details class="output"><summary>Programmausgabe</summary><pre>${result.stdout}</pre></details>`}
      ${result.stderr && app.ui.html`<details class="output"><summary>Fehlerausgabe</summary><pre>${result.stderr}</pre></details>`}
    </section>
  `;
}
