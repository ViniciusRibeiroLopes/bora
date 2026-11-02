import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./experience.css";
import "./design.css";
export const metadata: Metadata = {
  title: "Bora! — Agendador de rolês sem frescura",
  description:
    "Menos vamos marcar. Mais bora. Escolha as datas, mande o link e reúna sua galera. Sem cadastro.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#101310" },
    { media: "(prefers-color-scheme: light)", color: "#f5f5ef" },
  ],
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t;try{t=localStorage.getItem('bora:theme')}catch(e){}document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'})()` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
