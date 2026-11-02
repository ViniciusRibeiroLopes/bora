import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
export const metadata: Metadata = {
  title: "Bora! — Agendador de rolês sem frescura",
  description:
    "Menos vamos marcar. Mais bora. Escolha as datas, mande o link e reúna sua galera. Sem cadastro.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#11130f",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
