import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    tanstackStart(),
    viteReact(),
    nitro({ preset: process.env.VERCEL ? "vercel" : "node-server" }),
    tailwindcss(),
  ],
})
