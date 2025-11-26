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

type AlgorithmType = "step" | "dda" | "bresenham_line" | "bresenham_circle";

interface Point {
  x: number;
  y: number;
}

interface DrawResult {
  pixels: Point[];
  time: number;
}

const Algorithms = {
  // 1. Пошаговый алгоритм (y = kx + b)
  stepByStep: (p1: Point, p2: Point): Point[] => {
    const pixels: Point[] = [];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // Идем по X
    if (dx === 0) return [{ x: p1.x, y: p1.y }]; // Точка
    const k = dy / dx;
    const b = p1.y - k * p1.x;
    const start = Math.min(p1.x, p2.x);
    const end = Math.max(p1.x, p2.x);
    for (let x = start; x <= end; x++) {
      const y = Math.round(k * x + b);
      pixels.push({ x, y });
    }

    // Можно добавить дополнительный цикл по Y, для случая когда линия слишком крутая и dx < dy

    // if (Math.abs(dx) >= Math.abs(dy)) {
    //   if (dx === 0) return [{ x: p1.x, y: p1.y }]; // Точка
    //   const k = dy / dx;
    //   const b = p1.y - k * p1.x;
    //   const start = Math.min(p1.x, p2.x);
    //   const end = Math.max(p1.x, p2.x);
    //   for (let x = start; x <= end; x++) {
    //     const y = Math.round(k * x + b);
    //     pixels.push({ x, y });
    //   }
    // } else {
    //   // Идем по Y (если наклон крутой)
    //   const k = dx / dy;
    //   const b = p1.x - k * p1.y;
    //   const start = Math.min(p1.y, p2.y);
    //   const end = Math.max(p1.y, p2.y);
    //   for (let y = start; y <= end; y++) {
    //     const x = Math.round(k * y + b);
    //     pixels.push({ x, y });
    //   }
    // }
    return pixels;
  },

  // 2. ЦДА (Цифровой Дифференциальный Анализатор)
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
      pixels.push({ x: Math.round(x), y: Math.round(y) });
      x += xInc;
      y += yInc;
    }
    return pixels;
  },

  // 3. Брезенхем (Линия) - только целочисленная арифметика
  bresenhamLine: (p1: Point, p2: Point): Point[] => {
    const pixels: Point[] = [];
    let x0 = p1.x;
    let y0 = p1.y;
    const x1 = p2.x;
    const y1 = p2.y;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      pixels.push({ x: x0, y: y0 });
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

    const addSymmetricPoints = (
      xc: number,
      yc: number,
      x: number,
      y: number
    ) => {
      pixels.push({ x: xc + x, y: yc + y });
      pixels.push({ x: xc - x, y: yc + y });
      pixels.push({ x: xc + x, y: yc - y });
      pixels.push({ x: xc - x, y: yc - y });
      pixels.push({ x: xc + y, y: yc + x });
      pixels.push({ x: xc - y, y: yc + x });
      pixels.push({ x: xc + y, y: yc - x });
      pixels.push({ x: xc - y, y: yc - x });
    };

    while (y >= x) {
      addSymmetricPoints(center.x, center.y, x, y);
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
};

// --- Основной Компонент ---

const Raster: React.FC = () => {
  // Состояния
  const [scale, setScale] = useState<number>(20); // Пикселей на единицу координат
  const [algorithm, setAlgorithm] = useState<AlgorithmType>("bresenham_line");
  const [p1, setP1] = useState<Point>({ x: -5, y: -5 });
  const [p2, setP2] = useState<Point>({ x: 10, y: 8 });
  const [radius, setRadius] = useState<number>(10);
  const [lastResult, setLastResult] = useState<DrawResult | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Основная функция отрисовки
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Центр координат (сдвиг для (0,0) в центр экрана)
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    // 1. Очистка
    ctx.clearRect(0, 0, width, height);

    // 2. Рисуем сетку
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Вертикальные линии
    // Начинаем от центра и идем в стороны, чтобы сетка совпадала с (0,0)
    for (let x = centerX; x < width; x += scale) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let x = centerX; x > 0; x -= scale) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }

    // Горизонтальные линии
    for (let y = centerY; y < height; y += scale) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    for (let y = centerY; y > 0; y -= scale) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // 4. Рисуем Оси
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Ось X
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    // Ось Y
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    // Подписи осей
    ctx.fillStyle = "#000";
    ctx.font = "12px Arial";
    ctx.fillText("X", width - 15, centerY - 5);
    ctx.fillText("Y", centerX + 5, 15);
    ctx.fillText("(0,0)", centerX + 5, centerY + 15);

    // 5. Выполняем алгоритм
    const startTime = performance.now();
    let pixels: Point[] = [];

    if (algorithm === "bresenham_circle") {
      pixels = Algorithms.bresenhamCircle(p1, radius);
    } else if (algorithm === "bresenham_line") {
      pixels = Algorithms.bresenhamLine(p1, p2);
    } else if (algorithm === "dda") {
      pixels = Algorithms.dda(p1, p2);
    } else if (algorithm === "step") {
      pixels = Algorithms.stepByStep(p1, p2);
    }
    const endTime = performance.now();

    setLastResult({
      pixels,
      time: endTime - startTime,
    });

    // 6. Рисуем пиксели
    // Пиксель (x, y) - это квадрат.
    // В Canvas Y растет вниз, в математике вверх. Инвертируем Y.
    ctx.fillStyle = "#1976d2"; // Primary color

    pixels.forEach((p) => {
      const screenX = centerX + p.x * scale;
      const screenY = centerY - p.y * scale - scale;

      // Рисуем квадрат чуть меньше сетки, чтобы было видно границы
      ctx.fillRect(screenX + 1, screenY + 1, scale - 2, scale - 2);
    });
  };

  // Перерисовка при изменении параметров
  useEffect(() => {
    // Подгоняем размер canvas под контейнер
    if (containerRef.current && canvasRef.current) {
      canvasRef.current.width = containerRef.current.clientWidth;
      canvasRef.current.height = 500; // Фиксированная высота
    }

    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p1, p2, radius, algorithm, scale]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Лабораторная: Базовые алгоритмы растеризации
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
              min={2}
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
                Время выполнения:{" "}
                <strong>{lastResult.time.toFixed(4)} мс</strong>
                <br />
                Пикселей отрисовано: {lastResult.pixels.length}
              </Alert>
            )}

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 2, display: "block" }}
            >
              <strong>Справка:</strong> Целочисленные координаты привязаны к
              сетке так, что центр координаты (x,y) соответствует квадрату на
              экране. Ось Y направлена вверх. Сетка помогает визуализировать
              дискретность растра.
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
                style={{
                  display: "block",
                  backgroundColor: "#fafafa",
                  cursor: "crosshair",
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Raster;
