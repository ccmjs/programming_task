export const demo = {
  title: "Die Summe gerader Zahlen",
  task: "Das Programm liest eine ganze Zahl zwischen 0 und 10000 als obere Grenze ein. Berechne mit einer Schleife die Summe aller geraden Zahlen von 1 bis einschließlich dieser Grenze und speichere sie in summe.\n\nBeispiele: Bei der Eingabe 10 ist das Ergebnis 30, bei 9 ist es 20 und bei 0 ist es 0. Gib nur die Summe aus, ohne zusätzlichen Text.\n\nDas Einlesen mit IO.readln() und die Ausgabe mit IO.println(summe) sind bereits vorgegeben. Beim Prüfen stellen die JUnit-Tests die verschiedenen Eingaben automatisch bereit.\n\nErgänze deine Anweisungen innerhalb der geschweiften Klammern. Den vorgegebenen Rahmen void main() kannst du unverändert lassen; eine eigene Klasse oder zusätzliche Methoden brauchst du nicht.",
  startCode: `void main() {
    int obereGrenze = Integer.parseInt(IO.readln());
    int summe = 0;

    // Addiere hier die geraden Zahlen von 1 bis obereGrenze.

    IO.println(summe);
}
`,
  tests: `import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeFalse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

@Execution(ExecutionMode.SAME_THREAD)
class SolutionTest {
    @TempDir
    Path temporaeresVerzeichnis;

    private static boolean zeitlimitUeberschritten;

    @Test void grenze0Ergibt0() throws Exception { pruefe(0, 0); }
    @Test void grenze1Ergibt0() throws Exception { pruefe(1, 0); }
    @Test void grenze2Ergibt2() throws Exception { pruefe(2, 2); }
    @Test void grenze9Ergibt20() throws Exception { pruefe(9, 20); }
    @Test void grenze10Ergibt30() throws Exception { pruefe(10, 30); }
    @Test void grenze100Ergibt2550() throws Exception { pruefe(100, 2550); }

    private void pruefe(int obereGrenze, int erwarteteSumme) throws Exception {
        assumeFalse(zeitlimitUeberschritten,
            "Ein vorheriger Programmlauf hat das Zeitlimit überschritten.");

        // IO.readln() puffert System.in. Eine neue JVM gibt jedem Test eine eigene Eingabe.
        var java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        var klassenpfad = Path.of(SolutionTest.class.getProtectionDomain()
            .getCodeSource().getLocation().toURI()).toString();
        var ausgabedatei = temporaeresVerzeichnis.resolve("ausgabe.txt");
        var prozess = new ProcessBuilder(java, "-Xmx32m", "-cp", klassenpfad, "Solution")
            .redirectErrorStream(true)
            .redirectOutput(ausgabedatei.toFile())
            .start();
        try {
            try (var eingabe = prozess.getOutputStream()) {
                eingabe.write((obereGrenze + "\\n").getBytes(StandardCharsets.UTF_8));
            }
            boolean beendet = prozess.waitFor(2, TimeUnit.SECONDS);
            zeitlimitUeberschritten = !beendet;
            assertTrue(beendet, "Zeitlimit überschritten bei Eingabe " + obereGrenze);

            String ausgabe;
            try (var datei = Files.newInputStream(ausgabedatei)) {
                var bytes = datei.readNBytes(8193);
                assertTrue(bytes.length <= 8192, "Die Programmausgabe ist zu lang.");
                ausgabe = new String(bytes, StandardCharsets.UTF_8);
            }
            assertEquals(0, prozess.exitValue(),
                "Programmfehler bei Eingabe " + obereGrenze + ": " + ausgabe);
            assertEquals(String.valueOf(erwarteteSumme), ausgabe.strip(),
                "Falsche Summe bei Eingabe " + obereGrenze);
        } finally {
            prozess.destroyForcibly();
            prozess.waitFor(1, TimeUnit.SECONDS);
        }
    }
}
`,
  serverUrl: "http://localhost:3000/code",
  validate: ["ccm.load", "././resources/java_unit_grader.mjs#validate"],
  validationOptions: {
    sourceMode: "files",
    repairSyntax: false,
    quarantineMethods: false,
  },
};
