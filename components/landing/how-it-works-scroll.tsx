"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ChevronDown, ClipboardCheck, Search, Send, ShieldCheck, Tractor, type LucideIcon } from "lucide-react";

type Step = {
  num: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  methods?: string[];
};

const STEPS: Step[] = [
  {
    num: "01",
    icon: Search,
    title: "Explore Database",
    desc: "Browse agricultural and irrigation infrastructure projects. Filter by sub-program, budget, region, and status.",
  },
  {
    num: "02",
    icon: ClipboardCheck,
    title: "Inspect Site Details",
    desc: "Review coordinates, physical vs. financial progress, and the official program of works.",
  },
  {
    num: "03",
    icon: Send,
    title: "Report or Give Feedback",
    desc: "Three channels — Citizen Feed, Online E-Report, or SMS Grievance — each built for a different situation. See below to pick the one that fits.",
    methods: ["Citizen Feed", "Online E-Report", "SMS Grievance"],
  },
  {
    num: "04",
    icon: ShieldCheck,
    title: "Resolve Reported Issues",
    desc: "Government moderators investigate citizen feedback and coordinate actions to resolve problems.",
  },
];

const STEP_VH = 85;

export function HowItWorksScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });

  const tractorLeft = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const scrollHintOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0]);

  // Track which step is active based on scroll position.
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      const next = Math.min(STEPS.length - 1, Math.floor(v * STEPS.length));
      setActiveStep(next);
    });
  }, [scrollYProgress]);

  // Step badges stay lit once reached instead of fading back out with their panel.
  const dot1Opacity = useTransform(scrollYProgress, [0.23, 0.25], [0.35, 1]);
  const dot2Opacity = useTransform(scrollYProgress, [0.48, 0.5], [0.35, 1]);
  const dot3Opacity = useTransform(scrollYProgress, [0.73, 0.75], [0.35, 1]);
  const dotOpacities = [1, dot1Opacity, dot2Opacity, dot3Opacity];

  if (reduceMotion) {
    return <StaticHowItWorks />;
  }

  const step = STEPS[activeStep];

  return (
    <section
      ref={containerRef}
      aria-label="How It Works"
      className="relative bg-slate-50 dark:bg-slate-950"
      style={{ height: `${STEPS.length * STEP_VH}vh` }}
    >
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-4">
        <div className="mx-auto w-full max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            How It Works
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            INFRA Watch connects citizens, site monitors, and government administrators in a closed feedback loop.
          </p>
        </div>

        <div className="relative mt-14 w-full max-w-2xl">
          <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-800">
            <motion.div
              aria-hidden
              className="h-full origin-left rounded-full bg-primary dark:bg-indigo-500"
              style={{ scaleX: scrollYProgress }}
            />
          </div>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -top-[22px] -translate-x-1/2 text-primary drop-shadow-[0_2px_4px_rgba(79,70,229,0.35)] dark:text-indigo-400 dark:drop-shadow-[0_2px_4px_rgba(129,140,248,0.4)]"
            style={{ left: tractorLeft }}
          >
            <Tractor className="h-6 w-6" />
          </motion.div>
          <div className="absolute inset-x-0 top-4 flex justify-between">
            {STEPS.map((s, index) => (
              <motion.span
                key={s.num}
                aria-hidden
                style={{ opacity: dotOpacities[index] }}
                className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-white dark:bg-indigo-500"
              >
                {s.num}
              </motion.span>
            ))}
          </div>
        </div>

        <div className="relative mt-16 h-72 w-full max-w-xl sm:h-56">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-primary bg-white text-primary shadow-sm dark:border-indigo-400 dark:bg-slate-900 dark:text-indigo-300">
                <step.icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white sm:text-xl">{step.title}</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">{step.desc}</p>
              {step.methods && (
                <ul className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                  {step.methods.map((method) => (
                    <li key={method}>
                      <a
                        href="#reporting-channels"
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-primary dark:hover:text-indigo-300"
                      >
                        {method}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.div
          aria-hidden
          style={{ opacity: scrollHintOpacity }}
          className="pointer-events-none absolute bottom-8 flex flex-col items-center gap-1 text-slate-400 dark:text-slate-600"
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest">Scroll</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </motion.div>
      </div>
    </section>
  );
}

function StaticHowItWorks() {
  return (
    <section aria-label="How It Works" className="relative mx-auto max-w-6xl px-4 py-16 md:py-28">
      <div className="mx-auto mb-12 max-w-xl text-center md:mb-16">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          How It Works
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          INFRA Watch connects citizens, site monitors, and government administrators in a closed feedback loop.
        </p>
      </div>

      <div className="grid gap-10 sm:grid-cols-2 md:gap-x-6 lg:grid-cols-4">
        {STEPS.map((step) => (
          <div key={step.num} className="relative flex flex-col items-center text-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-50 text-primary shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-indigo-300">
              <step.icon className="h-6 w-6" aria-hidden />
              <span className="absolute -right-2.5 -top-2.5 rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-white shadow-md dark:bg-amber-400 dark:text-slate-900">
                {step.num}
              </span>
            </div>
            <h3 className="mt-5 font-bold text-base text-slate-900 dark:text-white">{step.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{step.desc}</p>
            {step.methods && (
              <ul className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                {step.methods.map((method) => (
                  <li key={method}>
                    <a
                      href="#reporting-channels"
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-primary dark:hover:text-indigo-300"
                    >
                      {method}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
