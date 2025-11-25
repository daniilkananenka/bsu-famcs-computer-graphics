import React, { useState, useEffect, type ChangeEvent } from "react";
import {
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Stack,
  Box,
  Chip,
  Paper,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";

interface ImageStats {
  min: number;
  max: number;
}

const LinearContrast: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(
    null
  );
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [stats, setStats] = useState<ImageStats | null>(null);

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

      let f_min = 255;
      let f_max = 0;

      for (let i = 0; i < data.length; i += 4) {
        const val = (data[i] + data[i + 1] + data[i + 2]) / 3;

        if (val < f_min) f_min = val;
        if (val > f_max) f_max = val;
      }

      setStats({ min: Math.round(f_min), max: Math.round(f_max) });

      if (f_max === f_min) {
        setProcessedImage(originalImage.src);
        return;
      }

      const scaleFactor = 255 / (f_max - f_min);

      for (let i = 0; i < data.length; i += 4) {
        // Берем текущую яркость (усредненную или R-канал, если ч/б)
        const currentF = (data[i] + data[i + 1] + data[i + 2]) / 3;

        // Формула: (f - f_min) * scaleFactor
        let newPixel = (currentF - f_min) * scaleFactor;

        // Ограничиваем (clamp)
        newPixel = Math.max(0, Math.min(255, newPixel));

        // Записываем результат (делаем изображение черно-белым контрастным)
        data[i] = newPixel; // R
        data[i + 1] = newPixel; // G
        data[i + 2] = newPixel; // B
        data[i + 3] = 255; // Alpha
      }

      ctx.putImageData(imageData, 0, 0);
      setProcessedImage(canvas.toDataURL());
    });
  }, [originalImage]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" align="center" gutterBottom>
        Линейное контрастирование
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

      {stats && (
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 4, textAlign: "center", bgcolor: "#f5f5f5" }}
        >
          <Typography variant="subtitle2" color="text.secondary">
            Найденный диапазон яркостей:
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            sx={{ mt: 1 }}
          >
            <Chip
              label={`f_min: ${stats.min}`}
              color="warning"
              variant="outlined"
            />
            <Chip
              label={`f_max: ${stats.max}`}
              color="success"
              variant="outlined"
            />
          </Stack>
        </Paper>
      )}

      {originalImage && processedImage && (
        <Grid container spacing={2} alignItems="center" justifyContent="center">
          <Grid size={4}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" align="center">
                  До
                </Typography>
              </CardContent>
              <Box
                sx={{
                  height: 300,
                  bgcolor: "#000",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <CardMedia
                  component="img"
                  image={originalImage.src}
                  alt="Original"
                  sx={{
                    maxHeight: "100%",
                    maxWidth: "100%",
                    objectFit: "contain",
                  }}
                />
              </Box>
            </Card>
          </Grid>

          <Grid size={4} sx={{ display: "flex", justifyContent: "center" }}>
            <CompareArrowsIcon
              sx={{
                fontSize: 60,
                color: "text.secondary",
                transform: { xs: "rotate(90deg)", md: "rotate(0deg)" },
              }}
            />
          </Grid>

          <Grid size={4}>
            <Card elevation={8} sx={{ border: "2px solid #1976d2" }}>
              <CardContent>
                <Typography variant="h6" align="center" color="primary">
                  После
                </Typography>
              </CardContent>
              <Box
                sx={{
                  height: 300,
                  bgcolor: "#000",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <CardMedia
                  component="img"
                  image={processedImage}
                  alt="Processed"
                  sx={{
                    maxHeight: "100%",
                    maxWidth: "100%",
                    objectFit: "contain",
                  }}
                />
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default LinearContrast;
