import { config } from "dotenv";

config();

console.log("🔍 Environment Check\n");

const checks = [
  {
    name: "NEON_DATABASE_URL",
    value: process.env.NEON_DATABASE_URL,
    valid: process.env.NEON_DATABASE_URL && !process.env.NEON_DATABASE_URL.includes("USER:PASSWORD"),
    required: true,
  },
  {
    name: "JWT_SECRET",
    value: process.env.JWT_SECRET ? `${process.env.JWT_SECRET.substring(0, 10)}...` : undefined,
    valid: process.env.JWT_SECRET && process.env.JWT_SECRET !== "replace-with-a-secure-random-string",
    required: true,
  },
  {
    name: "GROQ_API_KEY",
    value: process.env.GROQ_API_KEY ? `${process.env.GROQ_API_KEY.substring(0, 10)}...` : undefined,
    valid: process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 10,
    required: true,
  },
  {
    name: "CLIENT_URL",
    value: process.env.CLIENT_URL,
    valid: process.env.CLIENT_URL && (process.env.CLIENT_URL === "http://localhost:8080" || process.env.CLIENT_URL === "http://localhost:8081"),
    required: true,
  },
  {
    name: "VITE_API_BASE_URL",
    value: process.env.VITE_API_BASE_URL,
    valid: process.env.VITE_API_BASE_URL === "http://localhost:4000",
    required: true,
  },
];

let hasErrors = false;

checks.forEach(check => {
  const status = check.valid ? "✅" : check.required ? "❌" : "⚠️ ";
  const label = check.required ? "REQUIRED" : "OPTIONAL";
  
  console.log(`${status} ${check.name} (${label})`);
  if (!check.valid && check.required) {
    console.log(`   ⚠️  Not configured or using placeholder value`);
    hasErrors = true;
  } else if (!check.valid && !check.required) {
    console.log(`   ℹ️  Not configured (some features may not work)`);
  }
});

console.log("\n");

if (hasErrors) {
  console.log("❌ Configuration errors found!");
  console.log("Please update your .env file with the required values.");
  console.log("\nSee SETUP.md for detailed instructions.");
  process.exit(1);
} else {
  console.log("✅ All required environment variables are configured!");
  console.log("\nNext steps:");
  console.log("1. Run 'npm run db:init' to initialize the database");
  console.log("2. Start backend: 'npm run server:dev'");
  console.log("3. Start frontend: 'npm run dev'");
}
