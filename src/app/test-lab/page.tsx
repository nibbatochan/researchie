'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowSquareOut, CheckCircle, Table, Quotes, Image as ImageIcon, Sparkle } from '@phosphor-icons/react';

export default function TestLabPage() {
  return (
    <div className="min-h-screen bg-[#0F1117] text-slate-100 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <header className="border-b border-slate-800 pb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-lime animate-pulse" />
              <span className="font-mono text-xs text-lime uppercase tracking-wider font-bold">
                Researchie Testing Lab
              </span>
            </div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">
              In-Situ Research Sandbox
            </h1>
            <p className="text-sm text-slate-400 mt-1 font-sans">
              Use this local page to test text clipping, DOM block inspection, image marquee cropping, and in-popup summarization.
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-mono text-lime border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <span>Open Workbench</span>
            <ArrowSquareOut size={13} />
          </Link>
        </header>

        {/* Testing Guide Pods */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#161922] border border-slate-800">
            <div className="flex items-center gap-2 text-lime font-display font-bold text-sm mb-1">
              <Quotes size={16} />
              <span>1. Text Quote</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Highlight any sentence below & press <kbd className="bg-slate-800 px-1 py-0.5 rounded text-lime font-mono text-[10px]">Alt+S</kbd> or click the floating pill.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#161922] border border-slate-800">
            <div className="flex items-center gap-2 text-purple-400 font-display font-bold text-sm mb-1">
              <Table size={16} />
              <span>2. Block Picker</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Press <kbd className="bg-slate-800 px-1 py-0.5 rounded text-purple-300 font-mono text-[10px]">Alt+B</kbd> or click <b>block</b>. Hover table & press <kbd className="bg-slate-800 px-1 text-lime font-mono text-[10px]">↑</kbd> to expand.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#161922] border border-slate-800">
            <div className="flex items-center gap-2 text-blue-400 font-display font-bold text-sm mb-1">
              <ImageIcon size={16} />
              <span>3. Image Crop</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Press <kbd className="bg-slate-800 px-1 py-0.5 rounded text-blue-300 font-mono text-[10px]">Alt+C</kbd> or click <b>image</b>. Drag a box over the chart below.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#161922] border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-display font-bold text-sm mb-1">
              <Sparkle size={16} />
              <span>4. Summarize/Q&A</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Open popup and click <b>Summarize Page</b> or <b>Custom Q&A</b>, then click "+ Send to Platform".
            </p>
          </div>
        </div>

        {/* Sample Research Article */}
        <section className="space-y-4">
          <h2 className="text-xl font-display font-bold text-white">
            Article Section: Distributed GPU Cluster Inference & Latency Economics
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            In modern foundation model deployments, memory bandwidth saturation represents the dominant throughput bottleneck during autoregressive token generation. While compute FLOPs have scaled at over 3.4x per hardware generation, high-bandwidth memory (HBM3e) bus width remains constrained by silicon interposer geometry.
          </p>
          <blockquote className="border-l-2 border-lime pl-4 py-1 text-slate-200 text-sm italic bg-[#161922] rounded-r">
            "Speculative decoding combined with FP8 dynamic quantization reduces end-to-end time-to-first-token by 54% while maintaining zero degradation in benchmark perplexity."
          </blockquote>
          <p className="text-slate-300 text-sm leading-relaxed">
            Consequently, serving mixture-of-experts (MoE) architectures requires continuous dynamic KV-cache eviction policies to avoid quadratic memory fragmentation across multi-GPU nodes.
          </p>
        </section>

        {/* Sample DOM Block: Comparison & Pricing Grid */}
        <section className="space-y-4" id="pricing-comparison-container">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold text-white">
              Container Component: Hardware Tier Comparison Grid
            </h2>
            <span className="font-mono text-xs text-slate-500">
              Target for Block Inspector (Alt+B)
            </span>
          </div>

          <div className="p-6 rounded-2xl bg-[#161922] border border-slate-800 shadow-xl" id="hardware-spec-block">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#101218] border border-slate-800">
                <span className="text-xs font-mono text-slate-400 uppercase">Tier 1 • Edge</span>
                <h3 className="text-lg font-display font-bold text-white mt-1">NVIDIA L40S</h3>
                <p className="text-2xl font-bold text-lime mt-2">$0.45 <span className="text-xs text-slate-400">/ hr</span></p>
                <ul className="text-xs text-slate-300 mt-4 space-y-2 border-t border-slate-800 pt-3">
                  <li>✓ 48 GB GDDR6 Memory</li>
                  <li>✓ 862 GB/s Bandwidth</li>
                  <li>✓ Ideal for 7B–14B Dense Models</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#101218] border-2 border-lime/60 relative">
                <span className="absolute -top-2.5 right-4 bg-lime text-black font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  MOST POPULAR
                </span>
                <span className="text-xs font-mono text-slate-400 uppercase">Tier 2 • Standard</span>
                <h3 className="text-lg font-display font-bold text-white mt-1">NVIDIA H100 SXM</h3>
                <p className="text-2xl font-bold text-lime mt-2">$2.10 <span className="text-xs text-slate-400">/ hr</span></p>
                <ul className="text-xs text-slate-300 mt-4 space-y-2 border-t border-slate-800 pt-3">
                  <li>✓ 80 GB HBM3 Memory</li>
                  <li>✓ 3.35 TB/s Bandwidth</li>
                  <li>✓ Transformer Engine FP8</li>
                  <li>✓ Sub-200ms TTFT SLA</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#101218] border border-slate-800">
                <span className="text-xs font-mono text-slate-400 uppercase">Tier 3 • Ultra Scale</span>
                <h3 className="text-lg font-display font-bold text-white mt-1">NVIDIA B200 NVL</h3>
                <p className="text-2xl font-bold text-lime mt-2">$4.80 <span className="text-xs text-slate-400">/ hr</span></p>
                <ul className="text-xs text-slate-300 mt-4 space-y-2 border-t border-slate-800 pt-3">
                  <li>✓ 192 GB HBM3e Memory</li>
                  <li>✓ 8.0 TB/s Bandwidth</li>
                  <li>✓ Dual-die NVLink Interconnect</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Sample Table Block */}
        <section className="space-y-4">
          <h2 className="text-xl font-display font-bold text-white">
            Data Table: Throughput Benchmarks
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#161922]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#101218] text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Model Architecture</th>
                  <th className="p-3">Batch Size</th>
                  <th className="p-3">Throughput (TPS)</th>
                  <th className="p-3">KV-Cache Footprint</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                <tr>
                  <td className="p-3 font-medium text-white">Llama-3-70B FP8</td>
                  <td className="p-3 font-mono">32</td>
                  <td className="p-3 font-mono text-lime font-bold">1,420</td>
                  <td className="p-3 font-mono">18.4 GB</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-mono">OPTIMAL</span></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-white">Mixtral-8x22B MoE</td>
                  <td className="p-3 font-mono">16</td>
                  <td className="p-3 font-mono text-lime font-bold">890</td>
                  <td className="p-3 font-mono">31.2 GB</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 text-[10px] font-mono">TESTED</span></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-white">DeepSeek-V3 671B</td>
                  <td className="p-3 font-mono">8</td>
                  <td className="p-3 font-mono text-lime font-bold">580</td>
                  <td className="p-3 font-mono">64.0 GB</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-purple-950 text-purple-400 text-[10px] font-mono">VERIFIED</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Sample Diagram / Image */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold text-white">
              Visual Diagram: KV-Cache Paging Architecture
            </h2>
            <span className="font-mono text-xs text-slate-500">
              Target for Screen Crop (Alt+C)
            </span>
          </div>
          <div className="p-4 rounded-xl bg-[#161922] border border-slate-800 flex flex-col items-center justify-center">
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80"
              alt="Data Architecture Chart"
              className="max-h-72 rounded-lg object-contain border border-slate-700 shadow-md"
            />
            <p className="text-xs font-mono text-slate-400 mt-2">
              Figure 1.2: Memory bandwidth and cache utilization breakdown across concurrent inference streams.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
