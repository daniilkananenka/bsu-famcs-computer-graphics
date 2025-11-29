import React, { useState, useEffect, type ChangeEvent } from "react";
import { Container, Typography, Button, Card, Stack, Box } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import {
  parseFileContent,
  type LineSegment,
  type Rect,
  type Point,
} from "./utils";

// Коды для отсечения
const INSIDE = 0; // 0000
const LEFT = 1; // 0001
const RIGHT = 2; // 0010
const BOTTOM = 4; // 0100
const TOP = 8; // 1000

const MidpointClipping: React.FC = () => {
  const [segments, setSegments] = useState<LineSegment[]>([]);
  const [clipWindow, setClipWindow] = useState<Rect | null>(null);

  const computeOutCode = (p: Point, rect: Rect) => {
    let code = INSIDE;
    if (p.x < rect.min.x) code |= LEFT;
    else if (p.x > rect.max.x) code |= RIGHT;
    if (p.y < rect.min.y) code |= BOTTOM;
    else if (p.y > rect.max.y) code |= TOP;
    return code;
  };

  const midpointSubdivision = (
    p1: Point,
    p2: Point,
    rect: Rect,
    depth: number = 0
  ): LineSegment[] => {
    if (depth > 10) return [{ p1, p2 }];

    const code1 = computeOutCode(p1, rect);
    const code2 = computeOutCode(p2, rect);

    if ((code1 | code2) === 0) {
      return [{ p1, p2 }];
    }

    if ((code1 & code2) !== 0) {
      return [];
    }

    if (Math.abs(p1.x - p2.x) < 0.5 && Math.abs(p1.y - p2.y) < 0.5) {
      return [{ p1, p2 }];
    }

    const mid: Point = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };

    return [
      ...midpointSubdivision(p1, mid, rect, depth + 1),
      ...midpointSubdivision(mid, p2, rect, depth + 1),
    ];
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const data = parseFileContent(text);
        if (data) {
          setSegments(data.lines);
          setClipWindow(data.windowRect);
        }
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    if (!clipWindow || segments.length === 0) return;

    const canvas = document.getElementById(
      "midpointCanvas"
    ) as HTMLCanvasElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const padding = 50;
    const worldWidth = (clipWindow.max.x - clipWindow.min.x) * 2;
    const worldHeight = (clipWindow.max.y - clipWindow.min.y) * 2;

    // Центрируем камеру
    const centerX = (clipWindow.max.x + clipWindow.min.x) / 2;
    const centerY = (clipWindow.max.y + clipWindow.min.y) / 2;

    const scaleX = (canvas.width - padding * 2) / worldWidth;
    const scaleY = (canvas.height - padding * 2) / worldHeight;
    const scale = Math.min(scaleX, scaleY);

    // Функция перевода мировых координат в экранные
    // Y переворачиваем, так как на Canvas Y растет вниз
    const toScreen = (p: Point) => ({
      x: (p.x - centerX) * scale + canvas.width / 2,
      y: canvas.height / 2 - (p.y - centerY) * scale,
    });

    // Очистка
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Сетка
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Ось X
    const p0 = toScreen({ x: clipWindow.min.x - 1000, y: 0 });
    const p1 = toScreen({ x: clipWindow.max.x + 1000, y: 0 });
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    // Ось Y
    const p2 = toScreen({ x: 0, y: clipWindow.min.y - 1000 });
    const p3 = toScreen({ x: 0, y: clipWindow.max.y + 1000 });
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();

    // Отсекающее окно
    const winMin = toScreen(clipWindow.min);
    const winMax = toScreen(clipWindow.max);

    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      Math.min(winMin.x, winMax.x),
      Math.min(winMin.y, winMax.y),
      Math.abs(winMax.x - winMin.x),
      Math.abs(winMax.y - winMin.y)
    );

    // Исходные отрезки
    ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
    ctx.lineWidth = 1;
    segments.forEach((seg) => {
      const s1 = toScreen(seg.p1);
      const s2 = toScreen(seg.p2);
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();
    });

    // Результат
    ctx.strokeStyle = "green";
    ctx.lineWidth = 3;

    segments.forEach((seg) => {
      const visibleParts = midpointSubdivision(seg.p1, seg.p2, clipWindow);
      visibleParts.forEach((vis) => {
        const v1 = toScreen(vis.p1);
        const v2 = toScreen(vis.p2);
        ctx.beginPath();
        ctx.moveTo(v1.x, v1.y);
        ctx.lineTo(v2.x, v2.y);
        ctx.stroke();
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, clipWindow]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Часть 1: Алгоритм средней точки
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button
          variant="contained"
          component="label"
          startIcon={<CloudUploadIcon />}
        >
          Загрузить данные
          <input hidden type="file" accept=".txt" onChange={handleFileUpload} />
        </Button>
      </Stack>

      <Card variant="outlined" sx={{ p: 2, bgcolor: "#fafafa" }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <canvas
            id="midpointCanvas"
            width={800}
            height={500}
            style={{ border: "1px solid #ccc", backgroundColor: "#fff" }}
          />
        </Box>
      </Card>
    </Container>
  );
};

export default MidpointClipping;
