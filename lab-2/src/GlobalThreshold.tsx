import React, { useState, useEffect, type ChangeEvent } from "react";
import {
  Container,
  Typography,
  Button,
  Slider,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Stack,
  Box,
  Chip,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import TuneIcon from "@mui/icons-material/Tune";

interface ThresholdResults {
  manual: string;
  otsu: string;
}

const GlobalThreshold: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(
    null
  );
  const [results, setResults] = useState<ThresholdResults | null>(null);

  const [manualT, setManualT] = useState<number>(128);
  const [otsuT, setOtsuT] = useState<number | null>(null);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => setOriginalImage(img);
        if (event.target?.result) {
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateOtsuThreshold = (
    data: Uint8ClampedArray,
    totalPixels: number
  ): number => {
    const histogram = new Array(256).fill(0);

    // 1. Строим гистограмму
    for (let i = 0; i < data.length; i += 4) {
      const brightness = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
      histogram[brightness]++;
    }

    // 2. Алгоритм Оцу
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * histogram[i];

    let sumB = 0;
    let wB = 0; // Вес фона
    let wF = 0; // Вес объекта
    let maxVar = 0;
    let threshold = 0;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;

      wF = totalPixels - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];

      const mB = sumB / wB; // Среднее фона
      const mF = (sum - sumB) / wF; // Среднее объекта

      // Межклассовая дисперсия
      const varBetween = wB * wF * (mB - mF) * (mB - mF);

      if (varBetween > maxVar) {
        maxVar = varBetween;
        threshold = t;
      }
    }

    return threshold;
  };

  useEffect(() => {
    if (!originalImage) return;

    requestAnimationFrame(() => {
      const w = originalImage.width;
      const h = originalImage.height;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(originalImage, 0, 0);
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // 1. Вычисляем Оцу (только один раз или при смене картинки)
      const calculatedOtsu = calculateOtsuThreshold(data, w * h);
      setOtsuT(calculatedOtsu);

      // Создаем буферы для двух методов
      const manualData = ctx.createImageData(w, h);
      const otsuData = ctx.createImageData(w, h);

      // 2. Проходим по пикселям и применяем пороги
      for (let i = 0; i < data.length; i += 4) {
        // Яркость исходного пикселя
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;

        // --- Метод 1: Ручной ---
        const valManual = brightness > manualT ? 255 : 0;
        manualData.data[i] =
          manualData.data[i + 1] =
          manualData.data[i + 2] =
            valManual;
        manualData.data[i + 3] = 255;

        // --- Метод 2: Оцу ---
        const valOtsu = brightness > calculatedOtsu ? 255 : 0;
        otsuData.data[i] =
          otsuData.data[i + 1] =
          otsuData.data[i + 2] =
            valOtsu;
        otsuData.data[i + 3] = 255;
      }

      // Конвертация в URL
      const toUrl = (id: ImageData) => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d")?.putImageData(id, 0, 0);
        return c.toDataURL();
      };

      setResults({
        manual: toUrl(manualData),
        otsu: toUrl(otsuData),
      });
    });
  }, [originalImage, manualT]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" align="center" gutterBottom>
        Глобальная пороговая обработка
      </Typography>
      <Typography
        variant="body1"
        align="center"
        color="text.secondary"
        sx={{ mb: 4 }}
      >
        Бинаризация: превращение изображения в черно-белое (0 и 255)
      </Typography>

      <Stack direction="row" justifyContent="center" sx={{ mb: 4 }}>
        <Button
          variant="contained"
          component="label"
          startIcon={<CloudUploadIcon />}
        >
          Загрузить изображение
          <input
            hidden
            accept="image/*"
            type="file"
            onChange={handleImageUpload}
          />
        </Button>
      </Stack>

      <Card variant="outlined" sx={{ p: 3, mb: 4, bgcolor: "#fafafa" }}>
        <Grid container spacing={4} alignItems="center">
          <Grid size={6}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <TuneIcon color="primary" />
              <Typography variant="h6">Ручной метод</Typography>
            </Stack>
            <Typography variant="body2" gutterBottom>
              Порог T = <strong>{manualT}</strong>
            </Typography>
            <Slider
              value={manualT}
              min={0}
              max={255}
              onChange={(_, val) => setManualT(val as number)}
              valueLabelDisplay="auto"
            />
          </Grid>

          <Grid size={6}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <AutoFixHighIcon color="secondary" />
              <Typography variant="h6">Метод Оцу (Авто)</Typography>
            </Stack>
            {otsuT !== null && (
              <Chip
                label={`Найденный порог T = ${otsuT}`}
                color="secondary"
                variant="filled"
                sx={{ fontSize: "1rem", py: 2 }}
              />
            )}
          </Grid>
        </Grid>
      </Card>

      {originalImage && results && (
        <Grid container spacing={3}>
          <Grid size={4}>
            <ResultCard
              title="Исходное изображение"
              image={originalImage.src}
            />
          </Grid>

          <Grid size={4}>
            <ResultCard
              title="Ручной порог"
              subtitle={`T = ${manualT}`}
              image={results.manual}
            />
          </Grid>

          <Grid size={4}>
            <ResultCard
              title="Метод Оцу"
              subtitle={`T = ${otsuT}`}
              image={results.otsu}
            />
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

const ResultCard: React.FC<{
  title: string;
  subtitle?: string;
  image: string;
}> = ({ title, subtitle, image }) => (
  <Card
    elevation={3}
    sx={{ height: "100%", display: "flex", flexDirection: "column" }}
  >
    <CardContent sx={{ flexGrow: 0, pb: 1 }}>
      <Typography variant="h6" align="center">
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" align="center">
          {subtitle}
        </Typography>
      )}
    </CardContent>
    <Box
      sx={{
        flexGrow: 1,
        minHeight: 250,
        bgcolor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CardMedia
        component="img"
        image={image}
        alt={title}
        sx={{ maxHeight: "250px", maxWidth: "100%", objectFit: "contain" }}
      />
    </Box>
  </Card>
);

export default GlobalThreshold;
