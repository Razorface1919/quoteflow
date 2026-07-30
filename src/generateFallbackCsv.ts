import fs from "fs";
import path from "path";

const CATEGORIES = [
  {
    name: "Capacitors",
    prefixes: ["CC-0805-", "TA-1206-", "EC-RAD-", "MLCC-0402-"],
    desc: ["Ceramic Capacitor 50V", "Tantalum Capacitor 16V", "Electrolytic 25V", "SMD MLCC 10%"],
    vendors: ["Murata", "KEMET", "TDK", "Vishay", "Samsung Electromechanics"],
    basePrice: 2.5,
  },
  {
    name: "Resistors",
    prefixes: ["CRCW-0603-", "ERJ-0805-", "RC-1206-", "MFR-TH-"],
    desc: ["Thick Film Resistor 1%", "Thin Film SMD Resistor", "Precision Resistor 0.1W", "Metal Film Axial"],
    vendors: ["Vishay", "Yageo", "Panasonic", "ROHM", "Bourns"],
    basePrice: 1.2,
  },
  {
    name: "Integrated Circuits",
    prefixes: ["STM32F", "LM358-", "SN74HC-", "ATMEGA-", "PIC16F-"],
    desc: ["32-bit MCU 64KB Flash", "Dual Operational Amplifier", "NAND Gate Quad 2-Input", "8-bit AVR Microcontroller", "8-bit PIC MCU"],
    vendors: ["STMicroelectronics", "Texas Instruments", "Microchip", "Analog Devices", "NXP"],
    basePrice: 185.0,
  },
  {
    name: "Connectors",
    prefixes: ["RJ45-8P8C-", "USBC-REC-", "HDR-2X5-", "TERM-3P-"],
    desc: ["Modular Jack Shielded", "USB Type-C Receptacle", "Pin Header 2.54mm Pitch", "Terminal Block 3-Pos"],
    vendors: ["Amphenol", "Molex", "TE Connectivity", "JST", "Wurth Elektronik"],
    basePrice: 35.0,
  },
];

function generateRows(totalTarget = 520): string[] {
  const lines: string[] = [
    "manufacturer,manufacturerPartNum,description,category,unitPrice,stockQuantity",
  ];

  let count = 0;
  while (count < totalTarget) {
    const cat = CATEGORIES[count % CATEGORIES.length];
    const vendor = cat.vendors[Math.floor(Math.random() * cat.vendors.length)];
    const prefix = cat.prefixes[Math.floor(Math.random() * cat.prefixes.length)];
    const desc = cat.desc[Math.floor(Math.random() * cat.desc.length)];
    
    // Generate deterministic but realistic SKUs
    const sku = `${prefix}${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + (count % 26))}`;
    
    // Slight price variation
    const priceVariance = (Math.random() * 0.4 - 0.2) * cat.basePrice;
    const price = Math.max(0.5, (cat.basePrice + priceVariance)).toFixed(2);
    
    // Stock between 50 and 5000
    const stock = Math.floor(50 + Math.random() * 4950);

    lines.push(`"${vendor}","${sku}","${desc}","${cat.name}",${price},${stock}`);
    count++;
  }

  return lines;
}

const outputPath = path.resolve(process.cwd(), "prisma/seeds/fallback_parts.csv");

// Ensure folder exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, generateRows(525).join("\n"), "utf-8");
console.log(`✅ Generated 525 fallback parts at: ${outputPath}`);