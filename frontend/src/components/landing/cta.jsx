import React from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CTA() {
  const navigate = useNavigate();

  const handleStartFreeAnalysisClick = () => {
    // Handle the button click event
    navigate("/register");
  };

  return (
    <section className="py-20 md:py-32">
      <div className="container">
        <Card className="relative overflow-hidden border-2">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />
          <div className="relative p-8 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">
              Ready to Transform Your{" "}
              <span className="text-primary">WooCommerce Store?</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty">
              Join thousands of store owners who are making smarter decisions
              with data-driven insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={()=>{handleStartFreeAnalysisClick()}} size="lg" className="text-base">
                Start Free Analysis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              {/* <Button
                size="lg"
                variant="outline"
                className="text-base bg-transparent"
              >
                Schedule a Demo
              </Button> */}
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              No credit card required 
              {/* • Free 14-day trial • Cancel anytime */}
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}
