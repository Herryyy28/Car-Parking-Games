import * as THREE from 'three';

export interface VehiclePhysicsConfig {
  type: string;
  name: string;
  mass: number;             // kg (relative impact force)
  targetSpeed: number;      // max cruising velocity
  acceleration: number;     // m/s^2 rate of speed increase
  brakingPower: number;     // m/s^2 deceleration
  steeringSpeed: number;    // turning responsiveness
  maxSteerAngle: number;    // radians
  turningRadius: number;    // meters (lateral tightness)
  bodyRollFactor: number;   // outward chassis tilt multiplier
  suspensionStiffness: number;
  suspensionDamping: number;
  hasAirBrakes: boolean;
  reverseSpeed: number;
}

export const VEHICLE_PHYSICS_PRESETS: Record<string, VehiclePhysicsConfig> = {
  CAR: {
    type: 'CAR',
    name: 'Sedan / Hatchback',
    mass: 1400,
    targetSpeed: 18.5,
    acceleration: 26.0,
    brakingPower: 32.0,
    steeringSpeed: 14.0,
    maxSteerAngle: 0.52,
    turningRadius: 4.8,
    bodyRollFactor: 0.12,
    suspensionStiffness: 22.0,
    suspensionDamping: 0.85,
    hasAirBrakes: false,
    reverseSpeed: 7.0,
  },
  VAN: {
    type: 'VAN',
    name: 'Delivery Van',
    mass: 2400,
    targetSpeed: 16.0,
    acceleration: 20.0,
    brakingPower: 26.0,
    steeringSpeed: 11.0,
    maxSteerAngle: 0.44,
    turningRadius: 6.2,
    bodyRollFactor: 0.18,
    suspensionStiffness: 18.0,
    suspensionDamping: 0.8,
    hasAirBrakes: false,
    reverseSpeed: 5.5,
  },
  BUS: {
    type: 'BUS',
    name: 'Transit Bus',
    mass: 8500,
    targetSpeed: 13.5,
    acceleration: 15.0,
    brakingPower: 20.0,
    steeringSpeed: 7.5,
    maxSteerAngle: 0.36,
    turningRadius: 9.5,
    bodyRollFactor: 0.24,
    suspensionStiffness: 14.0,
    suspensionDamping: 0.75,
    hasAirBrakes: true,
    reverseSpeed: 4.2,
  },
  TRUCK: {
    type: 'TRUCK',
    name: 'Heavy Cargo Truck',
    mass: 12000,
    targetSpeed: 12.0,
    acceleration: 12.0,
    brakingPower: 18.0,
    steeringSpeed: 6.5,
    maxSteerAngle: 0.32,
    turningRadius: 11.0,
    bodyRollFactor: 0.28,
    suspensionStiffness: 12.0,
    suspensionDamping: 0.7,
    hasAirBrakes: true,
    reverseSpeed: 3.8,
  },
  SPECIAL: {
    type: 'SPECIAL',
    name: 'Rescue Vehicle',
    mass: 1800,
    targetSpeed: 21.0,
    acceleration: 30.0,
    brakingPower: 35.0,
    steeringSpeed: 16.0,
    maxSteerAngle: 0.55,
    turningRadius: 4.2,
    bodyRollFactor: 0.15,
    suspensionStiffness: 24.0,
    suspensionDamping: 0.9,
    hasAirBrakes: false,
    reverseSpeed: 8.0,
  },
};

export function getVehiclePhysicsConfig(type: string): VehiclePhysicsConfig {
  return VEHICLE_PHYSICS_PRESETS[type] || VEHICLE_PHYSICS_PRESETS.CAR;
}
