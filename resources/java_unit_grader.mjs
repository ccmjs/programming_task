/** Adapts java-unit-grader's POST /code endpoint to programming_task results. */
export async function validate(submission, { serverUrl, signal, options = {} }) {
  const policy = { sourceMode: "files", repairSyntax: false, quarantineMethods: false, ...options };
  const request = { ...policy, ...submission };
  const response = await fetch(serverUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "omit",
    cache: "no-store",
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok) throw new Error(`Der Java-Prüfserver meldet einen HTTP-Fehler (${response.status}).`);
  let data;
  try { data = await response.json(); }
  catch (error) {
    if (signal.aborted) throw error;
    throw new Error("Der Java-Prüfserver hat kein gültiges JSON zurückgegeben.");
  }

  const invalid = () => new Error("Unerwartetes Antwortformat von java-unit-grader. Bitte den /code-Endpunkt verwenden.");
  const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const string = (value, fallback = "") => {
    if (value === undefined) return fallback;
    if (typeof value !== "string") throw invalid();
    return value;
  };
  if (!object(data) || !["success", "error"].includes(data.status) || data.mode === "mutation") throw invalid();
  const validation = data.validation;
  if (!object(validation) || data.meta?.version !== String(submission.javaVersion)
    || ["javaVersion", "sourceMode", "fileName", "testFileName", "repairSyntax", "quarantineMethods"]
      .some(key => validation[key] !== request[key])
    || typeof validation.sourcePreserved !== "boolean"
    || !Array.isArray(validation.repairs) || !Array.isArray(validation.quarantinedMethods)
    || (!policy.repairSyntax && validation.repairs.length)
    || (!policy.quarantineMethods && validation.quarantinedMethods.length)
    || (validation.sourcePreserved && (validation.repairs.length || validation.quarantinedMethods.length))
    || (policy.sourceMode === "files" && !policy.repairSyntax && !policy.quarantineMethods && !validation.sourcePreserved))
    throw new Error("Der Java-Prüfserver bestätigt die angeforderte Java-Version und Quellcodebehandlung nicht. Bitte das Backend aktualisieren und die Konfiguration prüfen.");
  if (!object(data.compile) || typeof data.compile.success !== "boolean"
    || !Array.isArray(data.compile.errors) || !data.compile.errors.every(item => typeof item === "string")
    || !object(data.execution) || typeof data.execution.timeout !== "boolean"
    || typeof data.execution.ran !== "boolean" || !object(data.tests) || !Array.isArray(data.tests.cases)
    || !object(data.tests.summary)) throw invalid();
  if (data.compile.success && data.compile.errors.length) throw invalid();

  const tests = data.tests.cases.map(item => {
    if (!object(item) || typeof item.name !== "string" || !item.name.trim()
      || !["passed", "failed", "skipped"].includes(item.status)) throw invalid();
    if (item.failure !== undefined && !object(item.failure)) throw invalid();
    const className = string(item.classname);
    return {
      name: decodeXML(className ? `${className}.${item.name}` : item.name),
      status: item.status,
      message: item.failure
        ? decodeXML(string(item.failure.message)) || string(item.failure.stackTrace)
        : "",
    };
  });
  for (const key of ["total", "passed", "failed", "skipped"]) {
    const expected = key === "total" ? tests.length : tests.filter(item => item.status === key).length;
    if (data.tests.summary[key] !== expected) throw invalid();
  }
  const result = {
    status: "error",
    tests,
    // Positions refer to the submitted file only when no source transformation ran.
    diagnostics: validation.sourcePreserved ? data.compile.diagnostics ?? [] : [],
    message: string(data.comment),
    stdout: string(data.execution.stdout),
    stderr: [data.compile.errors.join("\n"), string(data.execution.stderr)].filter(Boolean).join("\n\n"),
  };
  if (data.execution.timeout) {
    result.message = "Das Zeitlimit des Java-Prüfservers wurde überschritten.";
  } else if (!data.compile.success) {
    result.status = "compile_error";
    result.message ||= "Die Quellen konnten nicht kompiliert werden.";
    if (!validation.sourcePreserved)
      result.message += "\nZeilennummern in der Compiler-Ausgabe beziehen sich auf die vom Backend aufbereiteten Quellen.";
  } else if (data.status === "error" || !data.execution.ran) {
    result.message ||= "Der Java-Prüfserver konnte die Prüfung nicht abschließen.";
  } else if (tests.some(item => item.status === "failed")) {
    result.status = "failed";
  } else if (data.execution.exitCode !== 0) {
    result.message ||= "Der Java-Testlauf wurde mit einem Fehler beendet.";
  } else if (tests.some(item => item.status === "passed")) {
    result.status = "passed";
  } else {
    result.message = "Es wurden keine JUnit-Tests ausgeführt. Bitte die Testkonfiguration prüfen.";
  }

  const changes = [
    ...validation.repairs.map(item => `Syntaxreparatur in ${string(item.file)}.java: ${string(item.description)}`),
    ...validation.quarantinedMethods.map(item => `Methode ausgelassen: ${string(item.file)}.${string(item.name)}`),
  ];
  if (changes.length) result.message = [result.message, "Geprüft wurde eine veränderte Fassung:", ...changes].filter(Boolean).join("\n");
  return result;

  function decodeXML(value) {
    const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, entity) => {
      if (!entity.startsWith("#")) return entities[entity] ?? match;
      const hex = entity[1].toLowerCase() === "x";
      const code = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    });
  }
}
