export const demo = {
  title: "Die Summe gerader Zahlen",
  task: "Implementiere die Methode sumEven(int[] numbers). Sie soll alle geraden Zahlen im Array addieren und die Summe zurückgeben.\n\nNegative gerade Zahlen zählen ebenfalls. Bei einem leeren Array ist das Ergebnis 0. Du kannst davon ausgehen, dass das Array nicht null ist und die Summe in einen int passt.",
  startCode: `public class Solution {
    public static int sumEven(int[] numbers) {
        // Ergänze hier deine Lösung.
        return 0;
    }
}
`,
  tests: `import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class SolutionTest {
    @Test
    void addsEvenNumbers() {
        assertEquals(6, Solution.sumEven(new int[] {1, 2, 3, 4}));
    }

    @Test
    void includesNegativeEvenNumbers() {
        assertEquals(-2, Solution.sumEven(new int[] {-4, -3, 2, 1}));
    }

    @Test
    void handlesEmptyArrays() {
        assertEquals(0, Solution.sumEven(new int[] {}));
    }
}
`,
  serverUrl: "",
};
