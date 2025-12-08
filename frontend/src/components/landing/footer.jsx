import React from "react";
import { BarChart3, Github, Twitter, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh opacity-20" />

      <div className="container relative mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center shadow-md">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Wosooly
              </span>
            </div>

            <p className="text-muted-foreground leading-relaxed max-w-md mb-6">
              Transform your WooCommerce and Excel data into actionable insights.
              Make smarter business decisions with powerful analytics.
            </p>

            <div className="flex items-center gap-3">
              <a
                href="#"
                className="h-10 w-10 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors group"
              >
                <Twitter className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
              </a>

              <a
                href="#"
                className="h-10 w-10 rounded-lg bg-accent/10 hover:bg-accent/20 flex items-center justify-center transition-colors group"
              >
                <Github className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
              </a>

              <a
                href="#"
                className="h-10 w-10 rounded-lg bg-secondary/10 hover:bg-secondary/20 flex items-center justify-center transition-colors group"
              >
                <Linkedin className="h-5 w-5 text-secondary group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Product</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Features</a></li>
              <li><a href="/subscription" className="text-muted-foreground hover:text-accent transition-colors">Pricing</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors">Security</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-success transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">About</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-accent transition-colors">Blog</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors">Contact</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-success transition-colors">Support</a></li>
            </ul>
          </div>

        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {/* © 2025 DataFlow Analytics. All rights reserved. */}
          </p>
          {/* <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-accent transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-secondary transition-colors">Cookie Policy</a>
          </div> */}
        </div>

      </div>
    </footer>
  );
}
