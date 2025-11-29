import React, { useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center } from "@react-three/drei";
import { Group } from "three";
import { Box, Typography, Slider, Paper, Divider } from "@mui/material";

type Vector3Array = [number, number, number];

interface LetterKProps {
  position: Vector3Array;
  rotation: Vector3Array;
  scale: number;
}

interface ControlSliderProps {
  label: string;
  value: number;
  onChange: (event: Event, value: number | number[]) => void;
  min: number;
  max: number;
  step: number;
}

const LetterK: React.FC<LetterKProps> = ({ position, rotation, scale }) => {
  const groupRef = useRef<Group>(null);

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={[scale, scale, scale]}
    >
      <Center>
        {/* Вертикаль */}
        <mesh position={[-0.6, 0, 0]}>
          <boxGeometry args={[0.8, 4, 0.8]} />
          <meshStandardMaterial color="#1976d2" roughness={0.3} />
        </mesh>

        {/* Верхняя диагональ */}
        <mesh position={[0.5, 1, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.8, 2.5, 0.8]} />
          <meshStandardMaterial color="#1976d2" roughness={0.3} />
        </mesh>

        {/* Нижняя диагональ */}
        <mesh position={[0.5, -1, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.8, 2.5, 0.8]} />
          <meshStandardMaterial color="#1976d2" roughness={0.3} />
        </mesh>
      </Center>
    </group>
  );
};

const ControlSlider: React.FC<ControlSliderProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
}) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" gutterBottom>
      {label} ({value.toFixed(2)})
    </Typography>
    <Slider
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      step={step}
      size="small"
      valueLabelDisplay="auto"
    />
  </Box>
);

const Graphics: React.FC = () => {
  const [position, setPosition] = useState<Vector3Array>([0, 0, 0]);
  const [rotation, setRotation] = useState<Vector3Array>([0, 0, 0]);
  const [scale, setScale] = useState<number>(1);

  const handlePosChange =
    (axis: 0 | 1 | 2) => (_: Event, newValue: number | number[]) => {
      const val = newValue as number;
      const newPos: Vector3Array = [...position];
      newPos[axis] = val;
      setPosition(newPos);
    };

  const handleRotChange =
    (axis: 0 | 1 | 2) => (_: Event, newValue: number | number[]) => {
      const val = newValue as number;
      const newRot: Vector3Array = [...rotation];
      newRot[axis] = val;
      setRotation(newRot);
    };

  const handleScaleChange = (_: Event, newValue: number | number[]) => {
    setScale(newValue as number);
  };

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        bgcolor: "#f0f0f0",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: 320,
          p: 3,
          m: 2,
          overflowY: "auto",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography
          variant="h6"
          color="primary"
          sx={{ mb: 2, fontWeight: "bold" }}
        >
          Настройки объекта
        </Typography>

        <Divider sx={{ my: 1 }}>Позиция</Divider>
        <ControlSlider
          label="X Axis"
          value={position[0]}
          min={-5}
          max={5}
          step={0.1}
          onChange={handlePosChange(0)}
        />
        <ControlSlider
          label="Y Axis"
          value={position[1]}
          min={-5}
          max={5}
          step={0.1}
          onChange={handlePosChange(1)}
        />
        <ControlSlider
          label="Z Axis"
          value={position[2]}
          min={-5}
          max={5}
          step={0.1}
          onChange={handlePosChange(2)}
        />

        <Divider sx={{ my: 1 }}>Вращение</Divider>
        <ControlSlider
          label="Rotate X"
          value={rotation[0]}
          min={-Math.PI}
          max={Math.PI}
          step={0.1}
          onChange={handleRotChange(0)}
        />
        <ControlSlider
          label="Rotate Y"
          value={rotation[1]}
          min={-Math.PI}
          max={Math.PI}
          step={0.1}
          onChange={handleRotChange(1)}
        />
        <ControlSlider
          label="Rotate Z"
          value={rotation[2]}
          min={-Math.PI}
          max={Math.PI}
          step={0.1}
          onChange={handleRotChange(2)}
        />

        <Divider sx={{ my: 1 }}>Масштаб</Divider>
        <ControlSlider
          label="Scale"
          value={scale}
          min={0.1}
          max={3}
          step={0.1}
          onChange={handleScaleChange}
        />

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: "auto", pt: 2 }}
        >
          * Мышь: Вращение (ЛКМ), Панорама (ПКМ), Зум (Колесо)
        </Typography>
      </Paper>

      <Box sx={{ flexGrow: 1, position: "relative" }}>
        <Canvas shadows camera={{ position: [0, 0, 10], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <pointLight
            position={[-10, -10, -10]}
            intensity={0.5}
            color="white"
          />

          <gridHelper args={[20, 20]} />
          <axesHelper args={[5]} />

          <OrbitControls makeDefault />

          <LetterK position={position} rotation={rotation} scale={scale} />
        </Canvas>
      </Box>
    </Box>
  );
};

export default Graphics;
