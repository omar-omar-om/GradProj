/* ==========================================================================
   Security Background Component
   ========================================================================== */

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Security Text Component
const SecurityText = () => {
  return (
    <div
      style={{
        position: 'absolute',
        left: '10%',
        top: '60%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '0',
      }}
    >
      <div
        style={{
          fontSize: '8rem',
          fontWeight: 'bold',
          color: 'rgba(59, 130, 246, 0.6)',
          textShadow: `
            0 0 10px rgba(59, 130, 246, 0.5),
            0 0 20px rgba(59, 130, 246, 0.3),
            0 0 30px rgba(59, 130, 246, 0.2)
          `,
          animation: 'floatText 3s ease-in-out infinite',
          zIndex: 1,
          pointerEvents: 'none',
          fontFamily: 'Arial, sans-serif',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          transformStyle: 'preserve-3d',
          perspective: '1000px',
          lineHeight: '0.8',
          whiteSpace: 'nowrap',
        }}
      >
        SECURE
      </div>
      <div
        style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          color: 'rgba(59, 130, 246, 0.4)',
          textShadow: `
            0 0 10px rgba(59, 130, 246, 0.3),
            0 0 20px rgba(59, 130, 246, 0.2),
            0 0 30px rgba(59, 130, 246, 0.1)
          `,
          animation: 'floatText 3s ease-in-out infinite',
          animationDelay: '0.5s',
          zIndex: 1,
          pointerEvents: 'none',
          fontFamily: 'Arial, sans-serif',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          transformStyle: 'preserve-3d',
          perspective: '1000px',
          lineHeight: '0.8',
          whiteSpace: 'nowrap',
          marginTop: '-1.5rem',
        }}
      >
        INSIGHTS
      </div>
    </div>
  );
};

// Security Shield Component
const SecurityShield = ({ position, rotation, scale, color }) => {
  const meshRef = React.useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.2;
      meshRef.current.rotation.x = Math.cos(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <Float
      speed={1.5}
      rotationIntensity={0.5}
      floatIntensity={0.5}
    >
      <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
        <octahedronGeometry args={[1, 0]} />
        <meshPhongMaterial
          color={color}
          transparent
          opacity={0.3}
          wireframe
        />
      </mesh>
    </Float>
  );
};

// Floating Circle Component
const FloatingCircle = ({ position, rotation, scale, color }) => {
  const meshRef = React.useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
      meshRef.current.rotation.y = Math.cos(state.clock.elapsedTime) * 0.2;
    }
  });

  return (
    <Float
      speed={2}
      rotationIntensity={1}
      floatIntensity={0.8}
    >
      <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
        <torusGeometry args={[1, 0.2, 16, 100]} />
        <meshPhongMaterial
          color={color}
          transparent
          opacity={0.3}
          wireframe
        />
      </mesh>
    </Float>
  );
};

// Main Security Background Component
const SecurityBackground = () => {
  // Generate circle positions - now using useMemo to maintain consistency
  const circles = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
    position: [
      // Left side circles
      i < 3 ? -12 : 12,  // Changed from -8/8 to -12/12 to move circles further out
      (Math.random() - 0.5) * 15,  // Increased vertical range from 10 to 15
      (Math.random() - 0.5) * 8,   // Increased depth range from 5 to 8
    ],
    rotation: [
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      0,
    ],
    scale: 0.8 + Math.random() * 0.4,
    color: i < 3 ? 0x3b82f6 : 0xef4444,  // blue for left, red for right
  })), []); // Empty dependency array means this will only run once

  // Generate shield positions - now using useMemo to maintain consistency
  const shields = useMemo(() => Array.from({ length: 4 }, (_, i) => ({
    position: [
      (Math.random() - 0.5) * 15,  // Increased range from 10 to 15
      (Math.random() - 0.5) * 15,  // Increased range from 10 to 15
      (Math.random() - 0.5) * 8,   // Increased depth range from 5 to 8
    ],
    rotation: [
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      0,
    ],
    scale: 1 + Math.random() * 0.5,
    color: i % 2 === 0 ? 0x3b82f6 : 0xef4444,  // alternating blue and red
  })), []); // Empty dependency array means this will only run once

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
      {/* Base Gradient Background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(90deg, 
              #000000 0%,
              #0a0a0a 25%,
              #1a1a1a 50%,
              #0a0a0a 75%,
              #000000 100%
            )
          `,
        }}
      />

      {/* Gradient Overlays */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(244, 63, 94, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)
          `,
        }}
      />

      {/* Animated Gradient Accent */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background: `
            linear-gradient(90deg, 
              rgba(99, 102, 241, 0.05) 0%,
              rgba(244, 63, 94, 0.1) 50%,
              rgba(168, 85, 247, 0.05) 100%
            )
          `,
          animation: "gradientAccent 15s ease-in-out infinite",
        }}
      />

      {/* Security Text */}
      <SecurityText />

      <Canvas camera={{ position: [0, 0, 20] }}>
        {/* Ambient Light */}
        <ambientLight intensity={0.8} />

        {/* Directional Light */}
        <directionalLight position={[5, 5, 5]} intensity={1.5} />

        {/* Security Shields */}
        {shields.map((shield, index) => (
          <SecurityShield
            key={`shield-${index}`}
            position={shield.position}
            rotation={shield.rotation}
            scale={shield.scale}
            color={shield.color}
          />
        ))}

        {/* Floating Circles */}
        {circles.map((circle, index) => (
          <FloatingCircle
            key={`circle-${index}`}
            position={circle.position}
            rotation={circle.rotation}
            scale={circle.scale}
            color={circle.color}
          />
        ))}
      </Canvas>

      {/* Add CSS Animations */}
      <style>
        {`
          @keyframes gradientShift {
            0% {
              transform: translate(0, 0) scale(1);
            }
            100% {
              transform: translate(2%, 2%) scale(1.02);
            }
          }

          @keyframes floatText {
            0% {
              transform: translateY(-50%) translateZ(0) rotateY(0deg);
            }
            50% {
              transform: translateY(-50%) translateZ(20px) rotateY(5deg);
            }
            100% {
              transform: translateY(-50%) translateZ(0) rotateY(0deg);
            }
          }
        `}
      </style>
    </div>
  );
};

export default SecurityBackground; 