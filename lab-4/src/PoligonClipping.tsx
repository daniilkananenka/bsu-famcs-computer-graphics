import React, { useState, useEffect, type ChangeEvent } from "react";
import { Container, Typography, Button, Card, Stack, Box } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import {
  parseFileContent,
  type LineSegment,
  type Rect,
  type Point,
} from "./utils";

const PolygonClipping: React.FC = () => {
  const [segments, setSegments] = useState<LineSegment[]>([]);
  const [polygon, setPolygon] = useState<Point[]>([]);
  const [bounds, setBounds] = useState<Rect | null>(null);

  const crossProduct = (a: Point, b: Point, p: Point) => {
    return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  };

  const isInside = (p: Point, poly: Point[]): boolean => {
    let positive = false;
    let negative = false;

    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      const cp = crossProduct(p1, p2, p);

      if (cp > 0) positive = true;
      if (cp < 0) negative = true;
      if (positive && negative) return false;
    }
    return true;
  };

  const isTriviallyOutside = (p1: Point, p2: Point, poly: Point[]): boolean => {
    let cx = 0,
      cy = 0;
    poly.forEach((v) => {
      cx += v.x;
      cy += v.y;
    });
    const center = { x: cx / poly.length, y: cy / poly.length };

    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];

      const cpCenter = crossProduct(a, b, center);
      const isInnerPositive = cpCenter >= 0;

      const cp1 = crossProduct(a, b, p1);
      const cp2 = crossProduct(a, b, p2);

      const p1Outside = isInnerPositive ? cp1 < 0 : cp1 > 0;
      const p2Outside = isInnerPositive ? cp2 < 0 : cp2 > 0;

      if (p1Outside && p2Outside) {
        return true;
      }
    }
    return false;
  };

  const clipMidpointRecursive = (
    p1: Point,
    p2: Point,
    poly: Point[],
    depth: number
  ): LineSegment[] => {
    const distSq = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
    // Ограничение рекурсии
    if (depth > 12 || distSq < 1) {
      if (isInside({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, poly)) {
        return [{ p1, p2 }];
      }
      return [];
    }

    const p1In = isInside(p1, poly);
    const p2In = isInside(p2, poly);

    if (p1In && p2In) {
      return [{ p1, p2 }];
    }

    if (isTriviallyOutside(p1, p2, poly)) {
      return [];
    }

    const mid: Point = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };

    return [
      ...clipMidpointRecursive(p1, mid, poly, depth + 1),
      ...clipMidpointRecursive(mid, p2, poly, depth + 1),
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
          const b = data.windowRect;
          setBounds(b);

          // Генерация 5-угольника
          const cx = (b.min.x + b.max.x) / 2;
          const cy = (b.min.y + b.max.y) / 2;
          const rx = (b.max.x - b.min.x) / 2.5;
          const ry = (b.max.y - b.min.y) / 2.5;

          const newPoly = [];
          const sides = 5;
          for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
            newPoly.push({
              x: cx + rx * Math.cos(angle),
              y: cy + ry * Math.sin(angle),
            });
          }
          setPolygon(newPoly);
        }
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    if (!bounds || segments.length === 0 || polygon.length === 0) return;

    const canvas = document.getElementById(
      "polyMidCanvas"
    ) as HTMLCanvasElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const padding = 50;
    const worldWidth = (bounds.max.x - bounds.min.x) * 1.5;
    const worldHeight = (bounds.max.y - bounds.min.y) * 1.5;
    const centerX = (bounds.max.x + bounds.min.x) / 2;
    const centerY = (bounds.max.y + bounds.min.y) / 2;

    const scaleX = (canvas.width - padding * 2) / worldWidth;
    const scaleY = (canvas.height - padding * 2) / worldHeight;
    const scale = Math.min(scaleX, scaleY);

    const toScreen = (p: Point) => ({
      x: (p.x - centerX) * scale + canvas.width / 2,
      y: canvas.height / 2 - (p.y - centerY) * scale,
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Многоугольник
    ctx.fillStyle = "rgba(0, 0, 255, 0.1)";
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const p0 = toScreen(polygon[0]);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < polygon.length; i++) {
      const pi = toScreen(polygon[i]);
      ctx.lineTo(pi.x, pi.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

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
      const parts = clipMidpointRecursive(seg.p1, seg.p2, polygon, 0);
      parts.forEach((part) => {
        const v1 = toScreen(part.p1);
        const v2 = toScreen(part.p2);
        ctx.beginPath();
        ctx.moveTo(v1.x, v1.y);
        ctx.lineTo(v2.x, v2.y);
        ctx.stroke();
      });
    });
  }, [segments, polygon, bounds]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>
        Часть 2: Отсечение многоугольником
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
            id="polyMidCanvas"
            width={800}
            height={500}
            style={{ border: "1px solid #ccc", backgroundColor: "#fff" }}
          />
        </Box>
      </Card>
    </Container>
  );
};

export default PolygonClipping;
