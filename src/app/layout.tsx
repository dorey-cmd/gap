import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "הפער שאף אחד לא מדבר עליו | אבחון עסקי אישי מבית AltruBiz",
  description: "אבחון עסקי אישי שחושף את חסמי הצמיחה שפוגעים בביצועים, יוצרים עומס ומונעים מהעסק להפוך למערכת יציבה, מסודרת ורווחית יותר.",
  icons: {
    icon: "https://storage.googleapis.com/msgsndr/O8tlYEQIUn4z3qPCt1FX/media/688019c09a4c2d4b4398bf3c.png",
    apple: "https://storage.googleapis.com/msgsndr/O8tlYEQIUn4z3qPCt1FX/media/688019c09a4c2d4b4398bf3c.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col bg-brand-soft/20 text-slate-900 selection:bg-brand-primary/10">
        {children}
      </body>
    </html>
  );
}
