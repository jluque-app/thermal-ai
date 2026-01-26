import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Image, TrendingUp, Shield } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-[#2D4057] mb-4">
            ThermalAI — Quantify Heat Losses from Thermal Images
          </h1>
          <p className="text-xl text-slate-700 mb-8 max-w-4xl mx-auto">
            AI-powered thermal analysis to identify heat losses in buildings, estimate energy waste, CO₂ emissions, and monetary costs, and support retrofit decisions.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/ExpertPreview')}
              variant="outline"
              className="border-[#2D9B87] text-[#2D9B87] hover:bg-[#E6F5F2]"
            >
              Try ThermalAI Expert (Preview)
            </Button>

            <Button
              size="lg"
              onClick={() => navigate('/NewAnalysis')}
              className="bg-[#2D9B87] hover:bg-[#268577] text-white"
            >
              Start Free Analysis
            </Button>

            <Button
              size="lg"
              onClick={() => navigate('/PlanSelection')}
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              View Pricing
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <Zap className="w-10 h-10 text-[#2D9B87] mb-2" />
              <CardTitle className="text-[#2D4057]">Fast Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get thermal analysis results quickly with AI-powered processing
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Image className="w-10 h-10 text-[#2D9B87] mb-2" />
              <CardTitle className="text-[#2D4057]">Image Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload RGB and thermal images for comprehensive heat-loss detection
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="w-10 h-10 text-[#2D9B87] mb-2" />
              <CardTitle className="text-[#2D4057]">Heat-Loss Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Estimate heat losses and contextualize their potential relevance with clear breakdowns
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="w-10 h-10 text-[#2D9B87] mb-2" />
              <CardTitle className="text-[#2D4057]">Hotspot Detection</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Identify thermal anomalies and areas requiring attention
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="bg-slate-50 rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-[#2D4057] mb-6 text-center">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#E6F5F2] text-[#2D9B87] font-bold text-xl mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-[#2D4057] mb-2">Upload Images</h3>
              <p className="text-slate-700">
                Upload both RGB and thermal images of your building facade
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#E6F5F2] text-[#2D9B87] font-bold text-xl mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-[#2D4057] mb-2">Enter Parameters</h3>
              <p className="text-slate-700">
                Provide location, area, energy price, and temperature data
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#E6F5F2] text-[#2D9B87] font-bold text-xl mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-[#2D4057] mb-2">Get Results</h3>
              <p className="text-slate-700">
                Review detailed thermal analysis with heat-loss estimates and exportable reports
              </p>
            </div>
          </div>

          <div className="text-center mt-8">
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={() => navigate('/NewAnalysis')}
                className="bg-[#2D9B87] hover:bg-[#268577] text-white"
              >
                Get Started
              </Button>

              <Button
                variant="secondary"
                onClick={() => navigate('/ExpertPreview')}
              >
                Ask ThermalAI Expert
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}