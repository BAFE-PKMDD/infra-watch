"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateEmailTemplate,
  resetEmailTemplate,
} from "@/actions/mutation/email-templates.mutation";
import {
  renderEmailTemplate,
  type ResolvedEmailTemplate,
} from "@/lib/email-template-registry";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  contentButtonClass,
  contentControlClass,
} from "@/components/admin/content/content-controls";

export function EmailTemplateEditor({
  template,
}: {
  template: ResolvedEmailTemplate;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [active, setActive] = useState(template.isActive);
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textArea = useRef<HTMLTextAreaElement>(null);
  const busy = useRef(false);
  const router = useRouter();
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const preview = useMemo(
    () => renderEmailTemplate({ subject, body }, template.sampleProps),
    [subject, body, template.sampleProps],
  );

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await updateEmailTemplate(template.slug, {
        subject,
        body,
        isActive: active,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success("Email template saved");
      router.refresh();
    } catch {
      setError("Template could not be saved. Try again.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function reset() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await resetEmailTemplate(template.slug);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSubject(template.defaultSubject);
      setBody(template.defaultBody);
      setActive(true);
      setResetOpen(false);
      toast.success("Default template restored");
      router.refresh();
    } catch {
      setError("Defaults could not be restored. Try again.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  function insertVariable(variable: string) {
    const area = textArea.current;
    const start = area?.selectionStart ?? body.length;
    const end = area?.selectionEnd ?? start;
    setBody(`${body.slice(0, start)}{{${variable}}}${body.slice(end)}`);
    area?.focus();
  }

  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <form
        onSubmit={save}
        className="space-y-5 rounded-lg border border-slate-300 bg-background p-5 sm:p-6 dark:border-slate-700"
        aria-busy={pending}
      >
        <h2 className="text-xl font-semibold">Template content</h2>
        <fieldset disabled={pending || !ready} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="email-template-subject"
              className="block text-sm font-semibold"
            >
              Subject line
            </label>
            <input
              id="email-template-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
              maxLength={300}
              className={contentControlClass}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="email-template-body"
              className="block text-sm font-semibold"
            >
              Body text
            </label>
            <textarea
              id="email-template-body"
              ref={textArea}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={12}
              required
              maxLength={20000}
              className={contentControlClass}
            />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Use plain text and {"{{variable}}"} placeholders. The preview uses
              labelled sample values.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Available variables</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {template.variables.map((variable) => (
                <Button
                  key={variable}
                  type="button"
                  variant="outline"
                  className={contentButtonClass}
                  onClick={() => insertVariable(variable)}
                >{`{{${variable}}}`}</Button>
              ))}
            </div>
            {template.requiredVariables.length ? (
              <p className="mt-2 text-sm">
                Keep{" "}
                {template.requiredVariables
                  .map((variable) => `{{${variable}}}`)
                  .join(", ")}{" "}
                in the body.
              </p>
            ) : null}
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="size-5 accent-primary"
            />
            Enable this email template
          </label>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Disabled templates do not send emails.
            {template.category === "system"
              ? " Disabling a code email prevents that authentication flow from completing."
              : ""}
          </p>
        </fieldset>
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-red-600 p-3 text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-between gap-3 border-t border-slate-300 pt-4 dark:border-slate-700">
          <Button
            type="button"
            variant="outline"
            className={contentButtonClass}
            onClick={() => setResetOpen(true)}
            disabled={pending || !ready}
          >
            Restore defaults
          </Button>
          <Button
            type="submit"
            className={contentButtonClass}
            disabled={pending || !ready}
          >
            {pending ? "Saving…" : "Save template"}
          </Button>
        </div>
      </form>
      <section
        className="min-w-0 space-y-4"
        aria-label="Email preview with sample data"
      >
        <h2 className="text-xl font-semibold">Preview with sample data</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          No email is sent by this preview.
        </p>
        <div className="rounded-lg border border-slate-300 bg-background p-4 dark:border-slate-700">
          <span className="text-sm font-semibold">Subject: </span>
          <span className="break-words text-sm">{preview.subject}</span>
        </div>
        <iframe
          title="Email template preview"
          srcDoc={preview.html}
          sandbox=""
          className="min-h-[480px] w-full rounded-lg border border-slate-300 bg-white dark:border-slate-700"
        />
      </section>
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore default template?</DialogTitle>
            <DialogDescription>
              Your saved changes will be replaced and the template will be
              enabled.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              className={contentButtonClass}
              onClick={() => setResetOpen(false)}
              disabled={pending || !ready}
            >
              Cancel
            </Button>
            <Button
              className={contentButtonClass}
              onClick={reset}
              disabled={pending || !ready}
            >
              {pending ? "Restoring…" : "Restore"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
