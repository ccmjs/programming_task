export const demo = {
  title: "Die Summe gerader Zahlen",
  task: "Berechne die Summe aller geraden Zahlen von 1 bis einschließlich 10 und speichere sie in summe. Verwende dafür eine Schleife.\n\nDas Programm soll anschließend nur das Ergebnis 30 ausgeben. Die Ausgabe mit IO.println(summe) ist bereits vorgegeben.\n\nErgänze deine Anweisungen innerhalb der geschweiften Klammern. Den vorgegebenen Rahmen void main() kannst du unverändert lassen; eine eigene Klasse oder zusätzliche Methoden brauchst du nicht.",
  startCode: `void main() {
    int summe = 0;

    // Addiere hier die geraden Zahlen von 1 bis 10.

    IO.println(summe);
}
`,
  tests: `import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.assertEquals;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.lang.reflect.InvocationTargetException;
import java.nio.charset.StandardCharsets;

class SolutionTest {
    @Test
    @DisplayName("Die Summe der geraden Zahlen von 1 bis 10 ist 30")
    void gibtDieSumme30Aus() throws Throwable {
        var ausgabe = new ByteArrayOutputStream();
        var vorherigeAusgabe = System.out;
        try (var umleitung = new PrintStream(ausgabe, true, StandardCharsets.UTF_8)) {
            System.setOut(umleitung);
            try {
                // Die implizite Klasse einer kompakten Quelldatei wird per Reflection aufgerufen.
                var klasse = Class.forName("Solution");
                var konstruktor = klasse.getDeclaredConstructor();
                konstruktor.setAccessible(true);
                var programm = konstruktor.newInstance();
                var main = klasse.getDeclaredMethod("main");
                main.setAccessible(true);
                try {
                    main.invoke(programm);
                } catch (InvocationTargetException fehler) {
                    throw fehler.getCause();
                }
            } finally {
                System.setOut(vorherigeAusgabe);
            }
        }
        assertEquals("30", ausgabe.toString(StandardCharsets.UTF_8).strip(),
            "Das Programm soll nur die Summe 30 ausgeben.");
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
