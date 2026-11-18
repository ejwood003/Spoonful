import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ActionFeedbackProvider } from "@/components/action-feedback";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spoonful — your recipes, the way you make them",
  description:
    "Keep a personal recipe catalogue, cook from it, and plan how much of each ingredient you need.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} h-full antialiased`}
    >
      <head>
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `(function(u,x,t,w,e,a,k,s){a=function(v){try{u.setItem(t+e,v)}catch(e){}v=JSON.parse(v);for(k=0;k<v.length;k++){s=x.createElement("script");s.text="(function(u,x,t,w,e,a,k){a=u[e]=function(){a.q.push(arguments)};a.q=[];a.t=+new Date;a.c=w;k=x.createElement('script');k.async=1;k.src=t;x.getElementsByTagName('head')[0].appendChild(k)})(window,document,'"+v[k].u+"',"+JSON.stringify(v[k].c)+",'"+v[k].g+"')";x.getElementsByTagName("head")[0].appendChild(s)}};try{k=u.getItem(t+e)}catch(e){}if(k){return a(k)}k=new XMLHttpRequest;k.onreadystatechange=function(){if(k.readyState==4&&k.status==200)a(k.responseText)};k.open("POST",w+e);k.send(x.URL)})(sessionStorage,document,"uxt:","https://api.uxtweak.com/snippet/","59d5fbe6-02aa-4f0f-abd3-7920f8d3aa91");`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider>
          <ActionFeedbackProvider>{children}</ActionFeedbackProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
