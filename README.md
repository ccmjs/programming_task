# ccmjs Programming Task

A Java programming exercise for **ccmjs 28.0.0**. It reuses the **code_editor**
component **v2.0.0** with CodeMirror 6, sends the current solution and configured JUnit
source to a backend, and displays the returned results and compiler diagnostics.
Both components use their own Shadow DOM.

## Demo and embedding

Serve this directory with a static web server and open `index.html`. The demo is
configured for **java-unit-grader**, initially at `http://localhost:3000/code`.
Its endpoint can be changed in the server field. The backend must be running;
the frontend does not simulate or execute Java.
The exercise uses a Java 25 compact source file with a supplied `void main()`
frame. The supplied input line reads an upper bound with
`Integer.parseInt(IO.readln())`. Learners add a loop to sum the even numbers from
1 through that bound (inclusive) and print the sum with `IO.println`. The input
is an integer from 0 through 10000; no class or additional method is needed.

JUnit supplies six inputs automatically: `0`, `1`, `2`, `9`, `10` and `100`, with
expected outputs `0`, `0`, `2`, `20`, `30` and `2550`. Each case starts the compiled
`Solution` in a fresh JVM using the backend's JDK, sends one input line and checks
the output. Separate runs prevent `IO.readln()`'s cached input reader or static
program state from leaking across cases. Each program run has a two-second time
limit; after a timeout, the remaining cases are skipped. The backend's overall
execution limit still applies. The demo provides no interactive console input:
the inputs come from JUnit. The checks verify results, not use of a loop.

No npm installation or build step is needed. The editor's view, stylesheet and
CodeMirror are loaded from the versioned Code Editor v2.0.0 release on jsDelivr,
so CDN access is required.
Opening via `file://` is unsupported.

```html
<script src="./libs/framework/ccm-28.0.0.min.js"></script>
<div id="exercise"></div>
<script type="module">
  import { demo } from './resources/configs.mjs';

  const app = await ccm.start('./ccm.programming_task.mjs', {
    ...demo,
    serverUrl: 'https://your-server.example/code'
  }, document.querySelector('#exercise'));
</script>
```

Resource URLs use plain `././...` strings. During local development, ccmjs loads
them relative to the hosting page; keep that page beside the component or provide
matching dependency URLs. The release workflow replaces this prefix with the
versioned CDN base. `libs/code_editor/` contains the published
`ccm.code_editor-2.0.0.min.mjs`, its source map and license. The editor's UI library,
view, stylesheet and CodeMirror use the published editor's default CDN URLs.
The published module is kept unchanged.

## Configuration

| Property | Default | Meaning |
| --- | --- | --- |
| `task` | `""` | Assignment as plain text; newlines are preserved |
| `startCode` | `""` | Initial Java source and reset value |
| `tests` | `""` | Java source of the JUnit test class |
| `serverUrl` | `""` | HTTP(S) endpoint; an absolute URL or a path relative to the page |
| `validate` | `null` | Async backend adapter; function or `ccm.load` dependency resolving to a function |
| `validationOptions` | `{}` | Backend-specific options passed as a snapshot to the adapter |
| `title` | `"Programmieraufgabe"` | Heading |
| `fileName` | `"Solution.java"` | Solution filename, without a directory |
| `testFileName` | `"SolutionTest.java"` | JUnit filename, different from `fileName` |
| `javaVersion` | `25` | Requested Java version, integer at least 25 |
| `requestTimeout` | `30000` | Client request timeout in milliseconds |
| `editor` | bundled ccmjs instance | Reusable code_editor dependency and its configuration |
| `root` | `"open"` | ccmjs Shadow DOM option: `open`, `closed`, or `false` |

The filenames must be simple Java filenames such as `Solution.java`. Public
class names and filenames must match. The JUnit example uses the Jupiter API.
`resources/configs.mjs` contains a complete exercise example.

The Java source and JUnit source are available on the client. This component is
intended for self-assessment. The assignment and all server-provided messages
are rendered as plain text, not HTML. Custom layouts can be provided through
the `views` and `css` dependencies.

## Configurable backend adapters

The component's default JSON contract is described below. To use a different
backend, configure `validate` with a function or a named module export loaded
through `ccm.load`. No change to the component source is needed for another API.
The demo uses:

```js
serverUrl: "http://localhost:3000/code",
validate: ["ccm.load", "././resources/java_unit_grader.mjs#validate"],
validationOptions: {
  sourceMode: "files",
  repairSyntax: false,
  quarantineMethods: false
}
```

An adapter has this signature:

```js
export async function validate(submission, { serverUrl, signal, options }) {
  // submission: { code, tests, fileName, testFileName, javaVersion }
  // Send requests in the backend's format, then return the result format below.
  // Pass signal to fetch() and other asynchronous work that supports cancellation.
}
```

`submission` is a snapshot of the code and exercise settings when checking starts.
`options` is a detached copy of `validationOptions`, a plain object of structured-cloneable values. The default JSON adapter ignores it; custom adapters decide how to use it.
`serverUrl` is an absolute HTTP(S) URL. The function controls the transport,
headers, authentication, request fields, response mapping and, if needed, polling.
It returns an object (or a Promise of one) in the normalized result format below.
Throw an `Error` with a useful message when the request cannot be completed.

The component validates the returned result and manages loading feedback,
timeouts and cancellation. Even an adapter that ignores `signal` cannot leave
the UI waiting indefinitely or apply a stale result; its own background work may
still continue. A browser adapter cannot bypass the backend's CORS policy.

Set `validate: null` to use the default JSON endpoint instead. In particular,
when reusing the demo configuration with that endpoint, override both `serverUrl`
and `validate`.

## java-unit-grader demo

`resources/java_unit_grader.mjs` connects **POST /code** of the Java-25 backend.
It sends the solution, JUnit source, filenames and Java version along with the
configured `sourceMode`, `repairSyntax` and `quarantineMethods` options. `/grade`
returns the Dynexite grading format and is not supported by this adapter.

The demo uses `sourceMode: "files"`, `repairSyntax: false` and
`quarantineMethods: false`. The backend writes both submitted sources unchanged
as UTF-8 files and compiles them with `javac --release 25`. It preserves comments,
package declarations and original line numbers. Syntax errors anywhere in the
submission prevent execution; no semicolons are inserted and no methods omitted.
Compiler diagnostics can therefore be shown at their original editor lines.

Both optional helpers can be enabled independently through `validationOptions`.
When a helper changes the source, the adapter displays the reported changes and
omits inline markers for that run. The backend's legacy `sourceMode: "split"`
remains available for splitting multiple top-level classes and using templates;
it does not guarantee unchanged source or editor line positions.

The adapter verifies the backend's `validation` response against the requested
options and Java version. For the strict demo it requires `sourcePreserved: true`.
An older backend that ignores these options is rejected with a configuration
error. The backend's `status: "success"` only means the request completed; the
adapter determines passed/failed from individual cases. Timeouts, missing cases
and exclusively skipped cases are not treated as success.

The backend includes a Java-25 Dockerfile and sandbox entrypoint. Build its image
with `docker build -t java-junit-grader:25 .` in the backend repository, then start
`node server.js`. See the backend README for deployment options. Local mode
requires JDK 25 or newer and compiles for Java 25; it runs code on the host and is
only suitable for the operator's own connection checks. The backend binds to
`127.0.0.1` by default; protect its unauthenticated library-management endpoints
when exposing it through a server or proxy.

## Default backend contract and normalized results

With `validate: null`, the component sends a `POST` to `serverUrl` with `Content-Type: application/json`
and `Accept: application/json`. It does not attach cookies or authentication
credentials. There is one solution file and one JUnit file per request:

```json
{
  "code": "public class Solution {\n    public static int sumEven(int[] numbers) { return 0; }\n}\n",
  "tests": "import org.junit.jupiter.api.Test;\nimport static org.junit.jupiter.api.Assertions.assertEquals;\nclass SolutionTest {\n    @Test void addsEvenNumbers() {\n        assertEquals(6, Solution.sumEven(new int[] {1, 2, 3, 4}));\n    }\n}\n",
  "fileName": "Solution.java",
  "testFileName": "SolutionTest.java",
  "javaVersion": 25
}
```

Return HTTP 200 with JSON for a completed validation, including compilation or
assertion failures. Example:

```json
{
  "status": "failed",
  "message": "Check how even numbers contribute to the sum.",
  "tests": [
    {
      "name": "addsEvenNumbers",
      "status": "failed",
      "message": "Expected: 6\nActual: 0"
    },
    { "name": "handlesEmptyArrays", "status": "passed" }
  ],
  "diagnostics": [],
  "stdout": "",
  "stderr": ""
}
```

| Overall `status` | Meaning |
| --- | --- |
| `passed` | At least one assertion case passed; none failed; no error diagnostics |
| `failed` | At least one assertion case failed |
| `compile_error` | Compilation failed |
| `error` | Execution or validation could not finish, for example a server time limit |

Each entry in `tests` has a nonempty `name`, a `status` of `passed`, `failed` or
`skipped`, and an optional string `message`. `tests` and `diagnostics` may be
omitted for compilation/execution errors. `message`, `stdout` and `stderr` are
optional strings. Unexpected response types or contradictory success results
are shown as a request error, never as a passed exercise.

Compiler diagnostics are optional. Example response:

```json
{
  "status": "compile_error",
  "diagnostics": [
    {
      "file": "Solution.java",
      "line": 3,
      "column": 9,
      "endLine": 3,
      "endColumn": 15,
      "severity": "error",
      "message": "Cannot find symbol: answer"
    }
  ]
}
```

`line` and `message` are required. Positions are one-based; columns count UTF-16
code units, and end positions are exclusive. Without an end position, the rest
of the line is marked. `severity` is `error` by default and can also be `warning`,
`info` or `hint`. Omit `file` or set it to `fileName` to mark the solution editor.
Diagnostics for `testFileName` or another file appear in the feedback list only.
All diagnostics remain visible in that list, including warnings.

Non-2xx HTTP responses, invalid JSON, connection failures and client timeouts
appear as request errors and can be retried. A cross-origin backend must allow
the frontend origin, the POST method, and the Content-Type header via CORS,
including the browser's OPTIONS preflight.

A backend implementing the default contract must provide the requested JDK
(25 or newer) and JUnit, reject unsupported versions, and compile/run the
submitted files. Other adapters must document how their backend selects Java. It must execute
untrusted Java in isolation with server-side time and memory limits. A client
abort or timeout stops waiting in the browser; it does not guarantee that the
server has stopped its process.

## Lifecycle and instance API

| Method | Behaviour |
| --- | --- |
| `start()` | Render/restart using the configured assignment and `startCode` |
| `check()` | Send the current source; resolve to the normalized result, or `null` on a request failure/cancellation |
| `getValue()` | Return `{ code, result }`; result is `null` until the current source has a completed result |
| `reset()` | Cancel a pending check, restore `startCode`, clear feedback and focus the editor |
| `cancel()` | Abort a pending request without changing the source |
| `destroy()` | Abort a pending request and release the child editor; safe to repeat |

Only one request per instance runs at a time. The editor stays editable while
waiting. Editing cancels a pending request and clears the old result; reset,
restart and destroy also prevent late responses from changing the UI. Feedback
updates leave the editor DOM, selection and undo history intact. The reset
button intentionally replaces the document and clears its undo history.

`check()` requires a started instance. A completed server response with
`status: "error"` is a result; a connection/protocol failure returns `null`.
Use `app.editor` for the code_editor API. Its default change notifications must
remain enabled when changing source programmatically so existing feedback can
be invalidated. Before permanently removing the parent, call `destroy()`.

## Repository layout and releases

- `ccm.programming_task.mjs`: configuration and all instance logic.
- `resources/views.mjs`, `resources/styles.css`: replaceable presentation.
- `resources/configs.mjs`: demo configuration with assignment, Java sources and adapter dependency.
- `resources/java_unit_grader.mjs`: adapter for the existing `/code` backend interface.
- `index.html`: demo, including its own script and styles.
- `libs/framework/`, `libs/ccm-ui/`: shared runtime dependencies.
- `libs/code_editor/`: published Code Editor v2.0.0, source map and license.

The manual Build & Tag workflow uses `ccmjs/component-release@v2.1.1`. It packages
the component and its runtime resources without a local npm/build setup.

## License

MIT. Licenses for local dependencies are included in their library directories.
The CDN-hosted CodeMirror bundle provides its
[package versions](https://cdn.jsdelivr.net/gh/ccmjs/code_editor@v2.0.0/libs/codemirror/versions.json)
and [license notices](https://cdn.jsdelivr.net/gh/ccmjs/code_editor@v2.0.0/libs/codemirror/LICENSES.txt).
