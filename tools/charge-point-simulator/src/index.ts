import { ChargePointSimulator } from "./simulator.js";

const GATEWAY_WS = process.env.OCPP_GATEWAY_WS ?? "ws://localhost:3002";
const CHARGE_POINTS = (process.env.SIM_CHARGE_POINTS ?? "SA-PAN-01,SA-CMB-01,SA-CMB-02,SA-KUR-01").split(
  ","
);

const simulators: ChargePointSimulator[] = [];

for (const ocppId of CHARGE_POINTS) {
  const sim = new ChargePointSimulator(ocppId.trim(), GATEWAY_WS);
  simulators.push(sim);
  sim.connect();
}

console.log(`Started ${simulators.length} charge point simulators → ${GATEWAY_WS}`);

process.on("SIGINT", () => {
  for (const sim of simulators) sim.disconnect();
  process.exit(0);
});
