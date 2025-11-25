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
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

interface OperationParams {
  chi: number;
  alpha: number;
  gamma: number;
}

interface ProcessedImages {
  addition: string;
  negative: string;
  multiplication: string;
  power: string;
  log: string;
}

const ElementOperations: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(
    null
  );
  const [results, setResults] = useState<ProcessedImages | null>(null);

  const [params, setParams] = useState<OperationParams>({
    chi: 50,
    alpha: 1.5,
    gamma: 0.6,
  });

  const clamp = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)));

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

  const handleSliderChange =
    (name: keyof OperationParams) =>
    (_event: Event, newValue: number | number[]) => {
      setParams((prev) => ({ ...prev, [name]: newValue as number }));
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
      const data = ctx.getImageData(0, 0, w, h).data;

      // Создаем буферы
      const createData = () => ctx.createImageData(w, h);
      const buffers = {
        addition: createData(),
        negative: createData(),
        multiplication: createData(),
        power: createData(),
        log: createData(),
      };

      // Расчет f_max
      let f_max = 0;
      for (let i = 0; i < data.length; i += 4) {
        const b = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (b > f_max) f_max = b;
      }
      f_max = f_max || 1;
      const logConstant = 255 / (Math.log(1 + f_max) || 1);

      // Пиксельная обработка
      for (let i = 0; i < data.length; i += 4) {
        const f = data[i]; // Берем R канал как яркость

        const setP = (imgData: ImageData, val: number) => {
          imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = val;
          imgData.data[i + 3] = 255;
        };

        setP(buffers.addition, clamp(f + params.chi));
        setP(buffers.negative, clamp(255 - f));
        setP(buffers.multiplication, clamp(f * params.alpha));
        setP(buffers.power, clamp(255 * Math.pow(f / f_max, params.gamma)));
        setP(buffers.log, clamp(logConstant * Math.log(1 + f)));
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
        addition: toUrl(buffers.addition),
        negative: toUrl(buffers.negative),
        multiplication: toUrl(buffers.multiplication),
        power: toUrl(buffers.power),
        log: toUrl(buffers.log),
      });
    });
  }, [originalImage, params]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" align="center" gutterBottom>
        Поэлементные операции
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
        <Grid container spacing={4} justifyContent="center">
          <Grid size={4}>
            <Typography gutterBottom>
              Сложение (χ): <strong>{params.chi}</strong>
            </Typography>
            <Slider
              value={params.chi}
              min={-100}
              max={100}
              onChange={handleSliderChange("chi")}
              valueLabelDisplay="auto"
            />
          </Grid>

          <Grid size={4}>
            <Typography gutterBottom>
              Умножение (α): <strong>{params.alpha}</strong>
            </Typography>
            <Slider
              value={params.alpha}
              min={0}
              max={3}
              step={0.1}
              onChange={handleSliderChange("alpha")}
              valueLabelDisplay="auto"
            />
          </Grid>

          <Grid size={4}>
            <Typography gutterBottom>
              Степень (γ): <strong>{params.gamma}</strong>
            </Typography>
            <Slider
              value={params.gamma}
              min={0.1}
              max={3}
              step={0.1}
              onChange={handleSliderChange("gamma")}
              valueLabelDisplay="auto"
            />
          </Grid>
        </Grid>
      </Card>

      {originalImage && results && (
        <Grid container spacing={3}>
          <ResultCard title="Исходное" image={originalImage.src} />
          <ResultCard title="1. Сложение" image={results.addition} />
          <ResultCard title="2. Негатив" image={results.negative} />
          <ResultCard title="3. Умножение" image={results.multiplication} />
          <ResultCard title="4. Степенное" image={results.power} />
          <ResultCard title="5. Логарифм" image={results.log} />
        </Grid>
      )}
    </Container>
  );
};

const ResultCard: React.FC<{
  title: string;
  image: string;
}> = ({ title, image }) => (
  <Grid size={4}>
    <Card elevation={3}>
      <CardContent sx={{ pb: 1 }}>
        <Typography variant="h6" component="div" align="center">
          {title}
        </Typography>
      </CardContent>
      <Box
        sx={{
          height: 250,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#000",
        }}
      >
        <CardMedia
          component="img"
          image={image}
          alt={title}
          sx={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
        />
      </Box>
    </Card>
  </Grid>
);

export default ElementOperations;
