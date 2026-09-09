import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "GridDispatch | Operator dispatch workspace",
  description:
    "Operator specific battery dispatch from probabilistic forecasts. Independent synthetic demonstration.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
