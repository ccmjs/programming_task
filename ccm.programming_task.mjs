/**
 * @overview Java programming exercise with a reusable code_editor and server feedback.
 * @author André Kless <andre.kless@web.de>
 * @copyright 2026 André Kless
 * @license MIT
 * @version 1.0.0
 */
export const component = {
  name: "programming_task",
  ccm: "././libs/framework/ccm-28.0.0.min.js",
  config: {
    ui: ["ccm.load", "././libs/ccm-ui/ccm-ui-1.0.0.min.mjs"],
    views: ["ccm.load", "././resources/views.mjs"],
    css: ["ccm.load", "././resources/styles.css"],
    editor: ["ccm.instance", "././libs/code_editor/ccm.code_editor-2.0.0.min.mjs", {
      language: "java",
      ariaLabel: "Java-Lösung",
      height: "380px",
    }],

    title: "Programmieraufgabe",
    task: "",
    startCode: "",
    tests: "",
    serverUrl: "",
    fileName: "Solution.java",
    testFileName: "SolutionTest.java",
    javaVersion: 25,
    requestTimeout: 30000,
  },
  Instance: function () {
    const app = this;
    let active = null;
    let mounted = false;

    this.state = { phase: "idle", result: null, message: "" };

    this.init = async () => {
      const onEditorChange = this.editor.onchange;
      this.editor.onchange = (event) => {
        if (mounted && this.state.phase !== "idle") {
          stopRequest();
          this.state = { phase: "idle", result: null, message: "Code geändert. Bitte erneut prüfen." };
          renderFeedback();
        }
        onEditorChange?.(event);
      };
    };

    /** Starts the exercise with its configured start code and no previous result. */
    this.start = async () => {
      validateOptions();
      stopRequest();
      mounted = false;
      this.editor.destroy();
      this.state = { phase: "idle", result: null, message: "" };
      this.editor.label = this.fileName;
      this.editor.setValue(this.startCode, { notify: false });
      this.ui.render(this.views.main(this), this.element, this);
      await this.editor.start();
      mounted = true;
      renderFeedback();
    };

    /** Returns the current source and a detached copy of the current server result. */
    this.getValue = () => ({
      code: this.editor.getValue(),
      result: this.state.result ? structuredClone(this.state.result) : null,
    });

    /** Sends one submission. Returns a result, or null on cancellation or request failure. */
    this.check = async () => {
      if (!mounted) throw new Error("Call start() before check()");
      if (active) return null;

      let url;
      let body;
      try {
        validateOptions();
        if (!this.serverUrl.trim()) throw new Error("Bitte eine Server-URL in der Konfiguration angeben.");
        if (!this.tests.trim()) throw new Error("Für diese Aufgabe sind noch keine JUnit-Tests hinterlegt.");
        try { url = new URL(this.serverUrl, document.baseURI); }
        catch { throw new Error("Die Server-URL ist ungültig."); }
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("Die Server-URL muss HTTP oder HTTPS verwenden.");
        body = JSON.stringify({
          code: this.editor.getValue(),
          tests: this.tests,
          fileName: this.fileName,
          testFileName: this.testFileName,
          javaVersion: this.javaVersion,
        });
      } catch (error) {
        this.state = { phase: "error", result: null, message: error.message };
        renderFeedback();
        return null;
      }

      const job = { controller: new AbortController(), timedOut: false, fileName: this.fileName };
      active = job;
      this.state = { phase: "checking", result: null, message: "" };
      this.editor.setDiagnostics([]);
      renderFeedback();
      job.timer = setTimeout(() => {
        job.timedOut = true;
        job.controller.abort();
      }, this.requestTimeout);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "omit",
          cache: "no-store",
          body,
          signal: job.controller.signal,
        });
        if (!response.ok) throw new Error(`Der Prüfserver meldet einen HTTP-Fehler (${response.status}).`);
        let data;
        try { data = await response.json(); }
        catch (error) {
          if (job.controller.signal.aborted) throw error;
          throw new Error("Der Prüfserver hat kein gültiges JSON zurückgegeben.");
        }
        const result = normalizeResponse(data);
        // An edited/reset/restarted exercise must never receive an old response.
        if (active !== job) return null;
        this.editor.setDiagnostics(result.diagnostics.filter(item => !item.file || item.file === job.fileName));
        this.state = { phase: "done", result, message: "" };
        return structuredClone(result);
      } catch (error) {
        if (active !== job) return null;
        this.state = {
          phase: "error", result: null,
          message: job.timedOut
            ? "Der Prüfserver hat nicht rechtzeitig geantwortet. Bitte erneut versuchen."
            : error instanceof TypeError
              ? "Der Prüfserver ist nicht erreichbar. Bitte Server-URL, Verbindung und CORS-Freigabe prüfen."
              : error.message,
        };
        return null;
      } finally {
        clearTimeout(job.timer);
        if (active === job) {
          active = null;
          renderFeedback();
        }
      }
    };

    this.reset = () => {
      stopRequest();
      this.editor.setValue(this.startCode, { notify: false });
      this.state = { phase: "idle", result: null, message: "Startcode wiederhergestellt." };
      renderFeedback();
      this.editor.focus();
    };

    this.cancel = () => {
      if (!active) return;
      stopRequest();
      this.state = { phase: "idle", result: null, message: "Prüfung abgebrochen." };
      renderFeedback();
    };

    this.destroy = () => {
      stopRequest();
      mounted = false;
      this.editor.destroy();
      this.state = { phase: "idle", result: null, message: "" };
    };

    this.events = {
      check: () => { void this.check(); },
      reset: () => this.reset(),
      cancel: () => this.cancel(),
    };

    function stopRequest() {
      if (!active) return;
      const previous = active;
      active = null;
      clearTimeout(previous.timer);
      previous.controller.abort();
    }

    /** Only replace feedback; the editor DOM, focus and undo history remain intact. */
    function renderFeedback() {
      if (!mounted) return;
      const busy = app.state.phase === "checking";
      app.element.querySelector('[data-on-click="check"]').disabled = busy;
      app.element.querySelector('[data-on-click="cancel"]').hidden = !busy;
      app.element.querySelector(".feedback").setAttribute("aria-busy", String(busy));
      app.ui.render(app.views.feedback(app), app.element.querySelector(".feedback"), app);
    }

    function validateOptions() {
      for (const key of ["title", "task", "startCode", "tests", "serverUrl", "fileName", "testFileName"])
        if (typeof app[key] !== "string") throw new TypeError(`${key} must be a string`);
      for (const key of ["fileName", "testFileName"])
        if (!/^[A-Za-z_$][\w$]*\.java$/.test(app[key])) throw new TypeError(`${key} must be a Java filename without a path`);
      if (app.fileName === app.testFileName) throw new Error("fileName and testFileName must differ");
      if (!Number.isInteger(app.javaVersion) || app.javaVersion < 25) throw new RangeError("javaVersion must be at least 25");
      if (!Number.isInteger(app.requestTimeout) || app.requestTimeout < 1 || app.requestTimeout > 2147483647)
        throw new RangeError("requestTimeout must be a positive integer up to 2147483647 milliseconds");
    }

    /** Validate the response before displaying a verdict or passing positions to the editor. */
    function normalizeResponse(data) {
      const invalid = () => new Error("Die Antwort des Prüfservers entspricht nicht dem vereinbarten JSON-Format.");
      const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
      const string = (value, fallback = "") => {
        if (value === undefined) return fallback;
        if (typeof value !== "string") throw invalid();
        return value;
      };
      const position = value => {
        if (!Number.isSafeInteger(value) || value < 1) throw invalid();
        return value;
      };
      if (!object(data) || !["passed", "failed", "compile_error", "error"].includes(data.status)) throw invalid();
      if (data.tests !== undefined && !Array.isArray(data.tests)) throw invalid();
      if (data.diagnostics !== undefined && !Array.isArray(data.diagnostics)) throw invalid();
      const tests = (data.tests ?? []).map(item => {
        if (!object(item) || typeof item.name !== "string" || !item.name.trim()
          || !["passed", "failed", "skipped"].includes(item.status)) throw invalid();
        return { name: item.name, status: item.status, message: string(item.message) };
      });
      const diagnostics = (data.diagnostics ?? []).map(item => {
        if (!object(item) || typeof item.message !== "string") throw invalid();
        const diagnostic = { line: position(item.line), message: item.message, severity: item.severity ?? "error" };
        if (!["error", "warning", "info", "hint"].includes(diagnostic.severity)) throw invalid();
        if (item.file !== undefined) diagnostic.file = string(item.file);
        for (const key of ["column", "endLine", "endColumn"])
          if (item[key] !== undefined) diagnostic[key] = position(item[key]);
        const endLine = diagnostic.endLine ?? diagnostic.line;
        if (endLine < diagnostic.line || (endLine === diagnostic.line && diagnostic.endColumn !== undefined
          && diagnostic.endColumn < (diagnostic.column ?? 1))) throw invalid();
        return diagnostic;
      });
      if (data.status === "passed" && (!tests.some(item => item.status === "passed")
        || tests.some(item => item.status === "failed") || diagnostics.some(item => item.severity === "error"))) throw invalid();
      if (data.status === "failed" && !tests.some(item => item.status === "failed")) throw invalid();
      return { status: data.status, tests, diagnostics, message: string(data.message),
        stdout: string(data.stdout), stderr: string(data.stderr) };
    }
  },
};
