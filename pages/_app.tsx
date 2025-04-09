// C:\Users\ADM\Desktop\USB MKT PRO V3\pages\_app.tsx
import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { Toaster } from "@/components/ui/toaster" // Import Toaster
import { ReactFlowProvider } from '@xyflow/react'; // <<< Importar Provider

export default function App({ Component, pageProps }: AppProps) {
  return (
    // <<< Envolver com ReactFlowProvider >>>
    <ReactFlowProvider>
        <Component {...pageProps} />
        <Toaster /> {/* Mantém o Toaster para notificações */}
    </ReactFlowProvider>
  )
}