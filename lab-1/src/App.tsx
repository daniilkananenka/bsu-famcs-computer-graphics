import {
  Heading,
  HStack,
  NumberInput,
  Slider,
  VStack,
  Grid,
  GridItem,
  ColorPicker,
  Portal,
  parseColor,
  Field,
} from "@chakra-ui/react";
import { useState } from "react";

type RGB = {
  r: number;
  g: number;
  b: number;
};

type CMYK = {
  c: number;
  m: number;
  y: number;
  k: number;
};

type HSV = {
  h: number;
  s: number;
  v: number;
};

function rgbToCmyk({ r, g, b }: RGB) {
  const r_ = r / 255;
  const g_ = g / 255;
  const b_ = b / 255;

  const k = 1 - Math.max(r_, g_, b_);

  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  return {
    c: ((1 - r_ - k) / (1 - k)) * 100,
    m: ((1 - g_ - k) / (1 - k)) * 100,
    y: ((1 - b_ - k) / (1 - k)) * 100,
    k: k * 100,
  };
}

function cmykToRgb({ c, m, y, k }: CMYK) {
  const c_ = c / 100;
  const m_ = m / 100;
  const y_ = y / 100;
  const k_ = k / 100;

  const r = 255 * (1 - c_) * (1 - k_);
  const g = 255 * (1 - m_) * (1 - k_);
  const b = 255 * (1 - y_) * (1 - k_);

  return { r, g, b };
}

function rgbToHsv({ r, g, b }: RGB) {
  const r_ = r / 255;
  const g_ = g / 255;
  const b_ = b / 255;

  const max = Math.max(r_, g_, b_);
  const min = Math.min(r_, g_, b_);

  const v = max;

  const diff = max - min;
  const s = max === 0 ? 0 : diff / max;

  let h;

  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r_:
        h = ((g_ - b_) / diff) % 6;
        break;
      case g_:
        h = (b_ - r_) / diff + 2;
        break;
      case b_:
        h = (r_ - g_) / diff + 4;
        break;
      default:
        throw Error("Something went wrong while RGB to HSV conversion");
    }
  }

  return { h: h * 60 < 0 ? 360 + h * 60 : h * 60, s: s * 100, v: v * 100 };
}

function hsvToRgb({ h, s, v }: HSV) {
  let r = 0,
    g = 0,
    b = 0;

  const h_ = h / 360;
  const s_ = s / 100;
  const v_ = v / 100;

  const i = Math.floor(h_ * 6);
  const f = h_ * 6 - i;
  const p = v_ * (1 - s_);
  const q = v_ * (1 - f * s_);
  const t = v_ * (1 - (1 - f) * s_);

  switch (i) {
    case 0:
      r = v_;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v_;
      b = p;
      break;
    case 2:
      r = p;
      g = v_;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v_;
      break;
    case 4:
      r = t;
      g = p;
      b = v_;
      break;
    case 5:
      r = v_;
      g = p;
      b = q;
      break;
  }

  return { r: r * 255, g: g * 255, b: b * 255 };
}

function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (c: number) => {
    const hex = Math.round(c).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): RGB {
  const color = parseColor(hex);

  return {
    r: color.getChannelValue("red"),
    g: color.getChannelValue("green"),
    b: color.getChannelValue("blue"),
  };
}

export function App() {
  const [rgb, setRgb] = useState<RGB>({ r: 0, g: 0, b: 0 });
  const [cmyk, setCmyk] = useState<CMYK>({ c: 0, m: 0, y: 0, k: 100 });
  const [hsv, setHsv] = useState<HSV>({ h: 0, s: 0, v: 0 });

  const handleRgbChange = (newRgb: RGB) => {
    setRgb(newRgb);
    setCmyk(rgbToCmyk(newRgb));
    setHsv(rgbToHsv(newRgb));
  };

  const handleCmykChange = (newCmyk: CMYK) => {
    setCmyk(newCmyk);
    const newRgb = cmykToRgb(newCmyk);
    setRgb(newRgb);
    setHsv(rgbToHsv(newRgb));
  };

  const handleHsvChange = (newHsv: HSV) => {
    setHsv(newHsv);
    const newRgb = hsvToRgb(newHsv);
    setRgb(newRgb);
    setCmyk(rgbToCmyk(newRgb));
  };

  const handleColorPickerChange = (hex: string) => {
    const newRgb = hexToRgb(hex);
    if (newRgb) {
      handleRgbChange(newRgb);
    }
  };

  return (
    <VStack align={"start"} p={8} gap={8}>
      <Heading size={"4xl"}>CMYK - RGB - HSV Converter</Heading>

      <VStack align="start" gap={4}>
        <Heading size={"2xl"}>Visual</Heading>
        <ColorPicker.Root
          value={parseColor(rgbToHex(rgb))}
          onValueChange={({ valueAsString }) =>
            handleColorPickerChange(valueAsString)
          }
          maxW="200px"
        >
          <ColorPicker.HiddenInput />
          <ColorPicker.Control>
            <ColorPicker.Input />
            <ColorPicker.Trigger />
          </ColorPicker.Control>
          <Portal>
            <ColorPicker.Positioner>
              <ColorPicker.Content>
                <ColorPicker.Area />
                <HStack>
                  <ColorPicker.EyeDropper size="xs" variant="outline" />
                  <ColorPicker.Sliders />
                </HStack>
              </ColorPicker.Content>
            </ColorPicker.Positioner>
          </Portal>
        </ColorPicker.Root>
      </VStack>

      <Grid
        templateColumns="repeat(auto-fit, minmax(320px, 1fr))"
        gap={12}
        w="100%"
      >
        <GridItem>
          <VStack align={"start"} gap={4}>
            <Heading size={"2xl"}>RGB</Heading>
            <ValueSelector
              label="Red"
              value={rgb.r}
              min={0}
              max={255}
              onValueChange={(value) => handleRgbChange({ ...rgb, r: value })}
            />
            <ValueSelector
              label="Green"
              value={rgb.g}
              min={0}
              max={255}
              onValueChange={(value) => handleRgbChange({ ...rgb, g: value })}
            />
            <ValueSelector
              label="Blue"
              value={rgb.b}
              min={0}
              max={255}
              onValueChange={(value) => handleRgbChange({ ...rgb, b: value })}
            />
          </VStack>
        </GridItem>

        <GridItem>
          <VStack align={"start"} gap={4}>
            <Heading size={"2xl"}>CMYK</Heading>
            <ValueSelector
              label="Cyan"
              value={cmyk.c}
              min={0}
              max={100}
              onValueChange={(value) => handleCmykChange({ ...cmyk, c: value })}
            />
            <ValueSelector
              label="Magenta"
              value={cmyk.m}
              min={0}
              max={100}
              onValueChange={(value) => handleCmykChange({ ...cmyk, m: value })}
            />
            <ValueSelector
              label="Yellow"
              value={cmyk.y}
              min={0}
              max={100}
              onValueChange={(value) => handleCmykChange({ ...cmyk, y: value })}
            />
            <ValueSelector
              label="Key"
              value={cmyk.k}
              min={0}
              max={100}
              onValueChange={(value) => handleCmykChange({ ...cmyk, k: value })}
            />
          </VStack>
        </GridItem>

        <GridItem>
          <VStack align={"start"} gap={4}>
            <Heading size={"2xl"}>HSV</Heading>
            <ValueSelector
              label="Hue"
              value={hsv.h}
              min={0}
              max={360}
              onValueChange={(value) => handleHsvChange({ ...hsv, h: value })}
            />
            <ValueSelector
              label="Saturation"
              value={hsv.s}
              min={0}
              max={100}
              onValueChange={(value) => handleHsvChange({ ...hsv, s: value })}
            />
            <ValueSelector
              label="Value"
              value={hsv.v}
              min={0}
              max={100}
              onValueChange={(value) => handleHsvChange({ ...hsv, v: value })}
            />
          </VStack>
        </GridItem>
      </Grid>
    </VStack>
  );
}

type ValueSelectorProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onValueChange: (value: number) => void;
};

function ValueSelector({
  label,
  value,
  min,
  max,
  onValueChange,
}: ValueSelectorProps) {
  return (
    <Field.Root>
      <Field.Label>{label}</Field.Label>
      <HStack>
        <NumberInput.Root
          width={{ base: "120px", md: "150px" }}
          value={value.toFixed(2)}
          onValueChange={({ valueAsNumber }) =>
            onValueChange(isNaN(valueAsNumber) ? 0 : valueAsNumber)
          }
          min={min}
          max={max}
          step={0.01}
        >
          <NumberInput.Control />
          <NumberInput.Input />
        </NumberInput.Root>
        <Slider.Root
          width={{ base: "120px", md: "150px" }}
          value={[value]}
          onValueChange={({ value }) =>
            onValueChange(isNaN(value[0]) ? 0 : value[0])
          }
          min={min}
          max={max}
          step={0.01}
        >
          <Slider.Control>
            <Slider.Track>
              <Slider.Range />
            </Slider.Track>
            <Slider.Thumbs />
          </Slider.Control>
        </Slider.Root>
      </HStack>
    </Field.Root>
  );
}
