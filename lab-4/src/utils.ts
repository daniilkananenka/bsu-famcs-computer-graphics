// types.ts
export interface Point {
  x: number;
  y: number;
}

export interface LineSegment {
  p1: Point;
  p2: Point;
}

export interface Rect {
  min: Point;
  max: Point;
}

export const parseFileContent = (text: string) => {
  const lines = text.trim().split("\n");
  const resultLines: LineSegment[] = [];
  let windowRect: Rect = { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } };

  // Фильтруем пустые строки и комментарии
  const cleanLines = lines
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("*"));

  if (cleanLines.length < 2) return null;

  try {
    // 1. Читаем число отрезков (игнорируем комментарии в строке)
    const n = parseInt(cleanLines[0].split(" ")[0]);

    // 2. Читаем n отрезков
    for (let i = 1; i <= n; i++) {
      const parts = cleanLines[i].trim().split(/\s+/).map(Number);
      resultLines.push({
        p1: { x: parts[0], y: parts[1] },
        p2: { x: parts[2], y: parts[3] },
      });
    }

    // 3. Читаем окно (последняя значащая строка)
    const lastLineParts = cleanLines[n + 1].trim().split(/\s+/).map(Number);
    windowRect = {
      min: {
        x: Math.min(lastLineParts[0], lastLineParts[2]),
        y: Math.min(lastLineParts[1], lastLineParts[3]),
      },
      max: {
        x: Math.max(lastLineParts[0], lastLineParts[2]),
        y: Math.max(lastLineParts[1], lastLineParts[3]),
      },
    };

    return { lines: resultLines, windowRect };
  } catch (e) {
    console.error("Ошибка парсинга", e);
    return null;
  }
};
