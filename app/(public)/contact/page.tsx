"use client";

import Image from "next/image";
import { getBlurDataURL } from "@/lib/image-utils";
import { motion, AnimatePresence } from "motion/react";
import { useForm } from "@tanstack/react-form";
import { Mail, MapPin, Phone, Send, User, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

import { createContactMessage } from "@/actions/mutation/contact.mutation";
import { useTranslation } from "@/i18n";

export default function ContactPage() {
  const { t } = useTranslation();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: ""
    },
    onSubmit: async ({ value, formApi }) => {
      setErrorMessage(null);
      try {
        const result = await createContactMessage(value);

        if (result.success) {
          formApi.reset();
          setIsSubmitted(true);
        } else {
          setErrorMessage(result.message || "Failed to send message. Please try again.");
        }
      } catch (error) {
        setErrorMessage("An error occurred while sending your message.");
      }
    }
  });

  const infoCards = [
    {
      title: t("contact.cards.headOffice.title"),
      icon: MapPin,
      lines: ["Bureau of Agricultural and Fisheries Engineering", "9th flr. Two Cyberpod Centris, EDSA Quezon Avenue, Brgy. Pinyahan, QC"]
    },
    {
      title: t("contact.cards.hotline.title"),
      icon: Phone,
      lines: ["0949-842-9485 or 0956-234-9888", "Monâ€“Fri, 8AMâ€“5PM"]
    },
    {
      title: t("contact.cards.email.title"),
      icon: Mail,
      lines: ["bafe@da.gov.ph", t("contact.form.responseInfo")]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero Section */}
      <div className="relative h-[280px] overflow-hidden bg-blue-700 dark:bg-slate-950">
        <div className="absolute inset-0">
          <Image 
            src="/hero-road.jpg" 
            alt="Contact" 
            fill 
            className="object-cover" 
            priority 
            quality={90} 
            placeholder="blur" 
            blurDataURL={getBlurDataURL(1920, 1080)} 
            sizes="100vw" 
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-sky-800/55 to-blue-800/60 dark:from-slate-950/90 dark:via-slate-900/85 dark:to-slate-950/90" />
        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
            <p className="text-amber-300 text-xs font-semibold tracking-[0.3em] uppercase mb-2">{t("contact.hero.subtitle")}</p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{t("contact.hero.title")}</h1>
            <p className="text-slate-100 max-w-2xl text-sm md:text-base">
              {t("contact.hero.description")}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {infoCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * index, ease: "easeOut" }}
              >
                <Card className="rounded-2xl bg-white shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-6 h-full">
                  <CardHeader className="p-0 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-blue-100 text-blue-700 dark:bg-sky-900/40 dark:text-sky-200">
                        <Icon className="w-5 h-5" />
                      </div>
                      <CardTitle className="text-base">{card.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 space-y-1">
                    {card.lines.map((line) => (
                      <p key={line} className="text-sm text-slate-700 dark:text-slate-300">
                        {line}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 dark:bg-slate-900 dark:border-slate-800"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <AnimatePresence mode="wait">
              {isSubmitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center text-center py-12"
                >
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-sky-900/40 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-blue-600 dark:text-sky-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    {t("contact.form.success.title")}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs mb-6">
                    {t("contact.form.success.desc")}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setIsSubmitted(false)}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {t("contact.form.success.cta")}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t("contact.form.title")}</h2>
                  </div>
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      form.handleSubmit();
                    }}
                  >
                    <FieldGroup>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <form.Field
                          name="name"
                          validators={{
                            onChange: ({ value }) => (!value.trim() ? "Name is required" : undefined)
                          }}
                        >
                          {(field) => {
                            const showError = field.state.meta.isTouched && field.state.meta.errors.length > 0;
                            return (
                              <Field className="space-y-1" data-invalid={showError}>
                                <FieldLabel htmlFor={field.name}>{t("contact.form.labels.name")}</FieldLabel>
                                <div className="flex items-center gap-2 rounded-lg border px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 dark:border-slate-700 dark:bg-slate-800">
                                  <User className="w-4 h-4 text-slate-400" />
                                  <Input
                                    id={field.name}
                                    type="text"
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    onBlur={field.handleBlur}
                                    className="border-none px-0"
                                    placeholder={t("contact.form.placeholders.name")}
                                    aria-invalid={showError}
                                    aria-describedby={`${field.name}-error`}
                                  />
                                </div>
                                <FieldError id={`${field.name}-error`} errors={showError ? field.state.meta.errors : undefined} />
                              </Field>
                            );
                          }}
                        </form.Field>

                        <form.Field
                          name="email"
                          validators={{
                            onChange: ({ value }) => {
                              if (!value.trim()) return "Email is required";
                              const emailPattern = /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/;
                              return emailPattern.test(value) ? undefined : "Enter a valid email address";
                            }
                          }}
                        >
                          {(field) => {
                            const showError = field.state.meta.isTouched && field.state.meta.errors.length > 0;
                            return (
                              <Field className="space-y-1" data-invalid={showError}>
                                <FieldLabel htmlFor={field.name}>{t("contact.form.labels.email")}</FieldLabel>
                                <div className="flex items-center gap-2 rounded-lg border px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 dark:border-slate-700 dark:bg-slate-800">
                                  <Mail className="w-4 h-4 text-slate-400" />
                                  <Input
                                    id={field.name}
                                    type="email"
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    onBlur={field.handleBlur}
                                    className="border-none px-0"
                                    placeholder={t("contact.form.placeholders.email")}
                                    aria-invalid={showError}
                                    aria-describedby={`${field.name}-error`}
                                  />
                                </div>
                                <FieldError id={`${field.name}-error`} errors={showError ? field.state.meta.errors : undefined} />
                              </Field>
                            );
                          }}
                        </form.Field>
                      </div>

                      <form.Field
                        name="subject"
                        validators={{
                          onChange: ({ value }) => (!value.trim() ? "Subject is required" : undefined)
                        }}
                      >
                        {(field) => {
                          const showError = field.state.meta.isTouched && field.state.meta.errors.length > 0;
                          return (
                            <Field className="space-y-1" data-invalid={showError}>
                              <FieldLabel htmlFor={field.name}>{t("contact.form.labels.subject")}</FieldLabel>
                              <div className="flex items-center gap-2 rounded-lg border px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 dark:border-slate-700 dark:bg-slate-800">
                                <MessageSquare className="w-4 h-4 text-slate-400" />
                                <Input
                                  id={field.name}
                                  type="text"
                                  value={field.state.value}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                  onBlur={field.handleBlur}
                                  className="border-none px-0"
                                  placeholder={t("contact.form.placeholders.subject")}
                                  aria-invalid={showError}
                                  aria-describedby={`${field.name}-error`}
                                />
                              </div>
                              <FieldError id={`${field.name}-error`} errors={showError ? field.state.meta.errors : undefined} />
                            </Field>
                          );
                        }}
                      </form.Field>

                      <form.Field
                        name="message"
                        validators={{
                          onChange: ({ value }) => {
                            if (!value.trim()) return "Message is required";
                            return value.trim().length < 10 ? "Please provide at least 10 characters" : undefined;
                          }
                        }}
                      >
                        {(field) => {
                          const showError = field.state.meta.isTouched && field.state.meta.errors.length > 0;
                          return (
                            <Field className="space-y-1" data-invalid={showError}>
                              <FieldLabel htmlFor={field.name}>{t("contact.form.labels.message")}</FieldLabel>
                              <Textarea
                                id={field.name}
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                                onBlur={field.handleBlur}
                                placeholder={t("contact.form.placeholders.message")}
                                aria-invalid={showError}
                                aria-describedby={`${field.name}-error`}
                              />
                              <FieldError id={`${field.name}-error`} errors={showError ? field.state.meta.errors : undefined} />
                            </Field>
                          );
                        }}
                      </form.Field>
                    </FieldGroup>

                    {errorMessage && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {errorMessage}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>{t("contact.form.responseInfo")}</span>
                      </div>
                      <form.Subscribe
                        selector={(state) => [state.isSubmitting]}
                        children={([isSubmitting]) => (
                          <Button
                            type="submit"
                            className="inline-flex items-center gap-2 px-4 py-2 min-w-[140px] justify-center bg-blue-700 hover:bg-blue-800 text-white"
                            disabled={isSubmitting}
                          >
                            {!isSubmitting && <Send className="w-4 h-4" />}
                            {isSubmitting ? t("contact.form.sending") : t("contact.form.submit")}
                          </Button>
                        )}
                      />
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div
            className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 space-y-5 dark:bg-slate-900 dark:border-slate-800"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t("contact.office.title")}</h2>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              BAFE - Two Cyberpod Centris, EDSA Quezon Avenue, Brgy. Pinyahan, QC
            </p>
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <iframe
                title="BAFE Office Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3854.494532314407!2d121.0396378!3d14.6419531!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b700a33f912b%3A0xc13f2e3ebcc6f2fd!2sCyberpod%20Centris%20Two%20-%20Eton%20Centris!5e0!3m2!1sen!2sph!4v1700000000000!5m2!1sen!2sph"
                width="100%"
                height="340"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

