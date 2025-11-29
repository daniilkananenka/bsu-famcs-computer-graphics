import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Typography,
  Button,
  Slider,
  Grid,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Box,
  Alert,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

type AlgorithmType =
  | "step"
  | "dda"
  | "bresenham_line"
  | "bresenham_circle"
  | "wu"
  | "castle_piteway";

interface Point {
  x: number;
  y: number;
  alpha?: number; // Прозрачность для алгоритма Ву (0..1)
}

interface DrawResult {
  pixels: Point[];
  time: number;
}

// Вспомогательные функции для Ву
const ipart = (x: number) => Math.floor(x);
const round = (x: number) => Math.round(x);
const fpart = (x: number) => x - Math.floor(x);
const rfpart = (x: number) => 1 - fpart(x);

const Algorithms = {
  // 1. Пошаговый
  stepByStep: (p1: Point, p2: Point): Point[] => {
    const pixels: Point[] = [];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    if (dx === 0) return [{ ...p1, alpha: 1 }];
    const k = dy / dx;
    const b = p1.y - k * p1.x;
    const start = Math.min(p1.x, p2.x);
    const end = Math.max(p1.x, p2.x);
    for (let x = start; x <= end; x++) {
      pixels.push({ x, y: Math.round(k * x + b), alpha: 1 });
    }

    // if (Math.abs(dx) >= Math.abs(dy)) {
    //   if (dx === 0) return [{ ...p1, alpha: 1 }];
    //   const k = dy / dx;
    //   const b = p1.y - k * p1.x;
    //   const start = Math.min(p1.x, p2.x);
    //   const end = Math.max(p1.x, p2.x);
    //   for (let x = start; x <= end; x++) {
    //     pixels.push({ x, y: Math.round(k * x + b), alpha: 1 });
    //   }
    // } else {
    //   const k = dx / dy;
    //   const b = p1.x - k * p1.y;
    //   const start = Math.min(p1.y, p2.y);
    //   const end = Math.max(p1.y, p2.y);
    //   for (let y = start; y <= end; y++) {
    //     pixels.push({ x: Math.round(k * y + b), y, alpha: 1 });
    //   }
    // }
    return pixels;
  },

  // 2. ЦДА
  dda: (p1: Point, p2: Point): Point[] => {
    const pixels: Point[] = [];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    const xInc = dx / steps;
    const yInc = dy / steps;

    let x = p1.x;
    let y = p1.y;

    for (let i = 0; i <= steps; i++) {
      pixels.push({ x: Math.round(x), y: Math.round(y), alpha: 1 });
      x += xInc;
      y += yInc;
    }
    return pixels;
  },

  // 3. Брезенхем (Линия)
  bresenhamLine: (p1: Point, p2: Point): Point[] => {
    const pixels: Point[] = [];
    let x0 = Math.round(p1.x);
    let y0 = Math.round(p1.y);
    const x1 = Math.round(p2.x);
    const y1 = Math.round(p2.y);

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      pixels.push({ x: x0, y: y0, alpha: 1 });
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
    return pixels;
  },

  // 4. Брезенхем (Окружность)
  bresenhamCircle: (center: Point, radius: number): Point[] => {
    const pixels: Point[] = [];
    let x = 0;
    let y = radius;
    let d = 3 - 2 * radius;

    const addPoints = (xc: number, yc: number, x: number, y: number) => {
      const pts = [
        { x: xc + x, y: yc + y, alpha: 1 },
        { x: xc - x, y: yc + y, alpha: 1 },
        { x: xc + x, y: yc - y, alpha: 1 },
        { x: xc - x, y: yc - y, alpha: 1 },
        { x: xc + y, y: yc + x, alpha: 1 },
        { x: xc - y, y: yc + x, alpha: 1 },
        { x: xc + y, y: yc - x, alpha: 1 },
        { x: xc - y, y: yc - x, alpha: 1 },
      ];
      pixels.push(...pts);
    };

    while (y >= x) {
      addPoints(center.x, center.y, x, y);
      x++;
      if (d > 0) {
        y--;
        d = d + 4 * (x - y) + 10;
      } else {
        d = d + 4 * x + 6;
      }
    }
    return pixels;
  },

  // 5. Алгоритм Ву (Сглаживание)
  wuLine: (p1: Point, p2: Point): Point[] => {
    const pixels: Point[] = [];
    let x0 = p1.x;
    let y0 = p1.y;
    let x1 = p2.x;
    let y1 = p2.y;

    const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);

    if (steep) {
      [x0, y0] = [y0, x0];
      [x1, y1] = [y1, x1];
    }
    if (x0 > x1) {
      [x0, x1] = [x1, x0];
      [y0, y1] = [y1, y0];
    }

    const dx = x1 - x0;
    const dy = y1 - y0;
    const gradient = dx === 0 ? 1 : dy / dx;

    let xend = round(x0);
    let yend = y0 + gradient * (xend - x0);
    let xgap = rfpart(x0 + 0.5);
    const xpxl1 = xend;
    const ypxl1 = ipart(yend);

    const plot = (x: number, y: number, c: number) => {
      if (steep) pixels.push({ x: y, y: x, alpha: c });
      else pixels.push({ x: x, y: y, alpha: c });
    };

    plot(xpxl1, ypxl1, rfpart(yend) * xgap);
    plot(xpxl1, ypxl1 + 1, fpart(yend) * xgap);

    let intery = yend + gradient;

    xend = round(x1);
    yend = y1 + gradient * (xend - x1);
    xgap = fpart(x1 + 0.5);
    const xpxl2 = xend;
    const ypxl2 = ipart(yend);

    plot(xpxl2, ypxl2, rfpart(yend) * xgap);
    plot(xpxl2, ypxl2 + 1, fpart(yend) * xgap);

    for (let x = xpxl1 + 1; x < xpxl2; x++) {
      plot(x, ipart(intery), rfpart(intery));
      plot(x, ipart(intery) + 1, fpart(intery));
      intery += gradient;
    }

    return pixels;
  },

  // 6. Алгоритм Кастла-Питвея
  castlePiteway: (p1: Point, p2: Point): Point[] => {
    // 0 = s (straight - по основной оси)
    // 1 = d (diagonal - по диагонали)

    const pixels: Point[] = [
      { x: Math.round(p1.x), y: Math.round(p1.y), alpha: 1 },
    ];

    let x = Math.round(p1.x);
    let y = Math.round(p1.y);

    const dx = Math.round(p2.x - p1.x);
    const dy = Math.round(p2.y - p1.y);

    const signX = Math.sign(dx);
    const signY = Math.sign(dy);

    let a = Math.abs(dx);
    let b = Math.abs(dy);
    let swapped = false;

    // Приводим задачу к первому октанту (0 <= b <= a)
    // Если наклон крутой (> 1), меняем роли осей
    if (b > a) {
      [a, b] = [b, a];
      swapped = true;
    }

    // Если b=0 (горизонтальная или вертикальная линия)
    if (b === 0) {
      for (let i = 0; i < a; i++) {
        x += swapped ? 0 : signX;
        y += swapped ? signY : 0;
        pixels.push({ x, y, alpha: 1 });
      }
      return pixels;
    }

    // Если a=b (диагональ)
    if (a === b) {
      for (let i = 0; i < a; i++) {
        x += signX;
        y += signY;
        pixels.push({ x, y, alpha: 1 });
      }
      return pixels;
    }

    let y_alg = b;
    let x_alg = a - b;

    let m1: number[] = [0];
    let m2: number[] = [1];

    while (x_alg !== y_alg) {
      if (x_alg > y_alg) {
        x_alg = x_alg - y_alg;
        // m2 = m1 + m2
        m2 = [...m1, ...m2];
      } else {
        y_alg = y_alg - x_alg;
        // m1 = m2 + m1
        m1 = [...m2, ...m1];
      }
    }

    const finalSequence = [...m2, ...m1];

    // Повторить эту последовательность x_alg раз
    const repeatCount = x_alg;

    for (let i = 0; i < repeatCount; i++) {
      for (const move of finalSequence) {
        if (move === 0) {
          // Шаг 's' (по основной оси)
          if (!swapped) {
            x += signX; // Основная ось X
          } else {
            y += signY; // Основная ось Y
          }
        } else {
          // Шаг 'd' (диагональный)
          x += signX;
          y += signY;
        }
        pixels.push({ x, y, alpha: 1 });
      }
    }

    return pixels;
  },
};

const Raster: React.FC = () => {
  const [scale, setScale] = useState<number>(20);
  const [algorithm, setAlgorithm] = useState<AlgorithmType>("bresenham_line");
  const [p1, setP1] = useState<Point>({ x: -8, y: -5 });
  const [p2, setP2] = useState<Point>({ x: 8, y: 2 });
  const [radius, setRadius] = useState<number>(10);
  const [lastResult, setLastResult] = useState<DrawResult | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    ctx.clearRect(0, 0, width, height);

    // Рисуем сетку
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = centerX; x < width; x += scale) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let x = centerX; x > 0; x -= scale) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = centerY; y < height; y += scale) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    for (let y = centerY; y > 0; y -= scale) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Рисуем Оси
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    // Подписи
    ctx.fillStyle = "#000";
    ctx.font = "12px Arial";
    ctx.fillText("X", width - 15, centerY - 5);
    ctx.fillText("Y", centerX + 5, 15);
    ctx.fillText("(0,0)", centerX + 5, centerY + 15);

    // Выполняем алгоритм
    const startTime = performance.now();
    let pixels: Point[] = [];

    switch (algorithm) {
      case "bresenham_circle":
        pixels = Algorithms.bresenhamCircle(p1, radius);
        break;
      case "bresenham_line":
        pixels = Algorithms.bresenhamLine(p1, p2);
        break;
      case "dda":
        pixels = Algorithms.dda(p1, p2);
        break;
      case "step":
        pixels = Algorithms.stepByStep(p1, p2);
        break;
      case "wu":
        pixels = Algorithms.wuLine(p1, p2);
        break;
      case "castle_piteway":
        pixels = Algorithms.castlePiteway(p1, p2);
        break;
    }
    const endTime = performance.now();

    setLastResult({ pixels, time: endTime - startTime });

    // Рисуем пиксели
    pixels.forEach((p) => {
      const screenX = centerX + p.x * scale;
      const screenY = centerY - p.y * scale - scale; // Сдвиг для (0,0) в левый угол клетки

      const alpha = p.alpha !== undefined ? p.alpha : 1;

      ctx.fillStyle = `rgba(25, 118, 210, ${alpha})`;
      ctx.fillRect(screenX + 1, screenY + 1, scale - 2, scale - 2);
    });
  };

  useEffect(() => {
    if (containerRef.current && canvasRef.current) {
      canvasRef.current.width = containerRef.current.clientWidth;
      canvasRef.current.height = 500;
    }
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p1, p2, radius, algorithm, scale]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Алгоритмы Растеризации
      </Typography>

      <Grid container spacing={3}>
        <Grid size={4}>
          <Paper
            elevation={3}
            sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Typography variant="h6">Настройки</Typography>

            <FormControl fullWidth size="small">
              <InputLabel>Алгоритм</InputLabel>
              <Select
                value={algorithm}
                label="Алгоритм"
                onChange={(e) => setAlgorithm(e.target.value as AlgorithmType)}
              >
                <MenuItem value="step">Пошаговый (y = kx + b)</MenuItem>
                <MenuItem value="dda">ЦДА (DDA)</MenuItem>
                <MenuItem value="bresenham_line">Брезенхем (Отрезок)</MenuItem>
                <MenuItem value="bresenham_circle">
                  Брезенхем (Окружность)
                </MenuItem>
                <MenuItem value="wu">Алгоритм Ву (Сглаживание)</MenuItem>
                <MenuItem value="castle_piteway">
                  Алгоритм Кастла-Питвея
                </MenuItem>
              </Select>
            </FormControl>

            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Координаты
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                label="X1 / Xc"
                size="small"
                type="number"
                value={p1.x}
                onChange={(e) => setP1({ ...p1, x: Number(e.target.value) })}
              />
              <TextField
                label="Y1 / Yc"
                size="small"
                type="number"
                value={p1.y}
                onChange={(e) => setP1({ ...p1, y: Number(e.target.value) })}
              />
            </Box>

            {algorithm === "bresenham_circle" ? (
              <TextField
                label="Радиус R"
                size="small"
                type="number"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              />
            ) : (
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  label="X2"
                  size="small"
                  type="number"
                  value={p2.x}
                  onChange={(e) => setP2({ ...p2, x: Number(e.target.value) })}
                />
                <TextField
                  label="Y2"
                  size="small"
                  type="number"
                  value={p2.y}
                  onChange={(e) => setP2({ ...p2, y: Number(e.target.value) })}
                />
              </Box>
            )}

            <Typography gutterBottom>Масштаб сетки</Typography>
            <Slider
              value={scale}
              min={5}
              max={50}
              onChange={(_, val) => setScale(val as number)}
              valueLabelDisplay="auto"
            />

            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={draw}
              size="large"
            >
              Перерисовать
            </Button>

            {lastResult && (
              <Alert icon={<AccessTimeIcon />} severity="info" sx={{ mt: 2 }}>
                Время: <strong>{lastResult.time.toFixed(4)} мс</strong> |
                Пикселей: {lastResult.pixels.length}
              </Alert>
            )}

            <Typography variant="caption" color="text.secondary">
              {algorithm === "wu" &&
                "Алгоритм Ву использует прозрачность пикселей (Anti-aliasing)."}
              {algorithm === "castle_piteway" &&
                "Алгоритм Кастла-Питвея строит линию, используя свойства НОД (алгоритм Евклида) для генерации паттерна шагов 's' и 'd'."}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={8}>
          <Card variant="outlined">
            <CardContent
              sx={{ p: 0, "&:last-child": { pb: 0 } }}
              ref={containerRef}
            >
              <canvas
                ref={canvasRef}
                style={{ display: "block", backgroundColor: "#fafafa" }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Raster;
