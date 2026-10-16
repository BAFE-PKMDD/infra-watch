import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  EMAIL_TEMPLATE_REGISTRY,
  getDefaultEmailTemplate,
  renderEmailTemplate,
  validateTemplateVariables,
} from "./email-template-registry";

test("the five FMR Watch template workflows are registered with INFRA Watch content", () => {
  assert.equal(EMAIL_TEMPLATE_REGISTRY.length, 5);
  for (const definition of EMAIL_TEMPLATE_REGISTRY) {
    validateTemplateVariables(
      definition,
      definition.defaultSubject,
      definition.defaultBody,
    );
    assert.doesNotMatch(
      definition.defaultSubject + definition.defaultBody,
      /FMR Watch/,
    );
    const preview = renderEmailTemplate(
      getDefaultEmailTemplate(definition.slug),
      definition.sampleProps,
    );
    assert.doesNotMatch(preview.text, /{{\w+}}/);
  }
});

test("code templates retain required placeholders and reject unknown variables", () => {
  const template = getDefaultEmailTemplate("otp-sign-in");
  assert.throws(
    () =>
      validateTemplateVariables(template, template.subject, "No code included"),
    /Keep {{otp}}/,
  );
  assert.throws(
    () => validateTemplateVariables(template, "{{unknown}}", template.body),
    /Unknown variables/,
  );
  assert.throws(
    () => getDefaultEmailTemplate("unregistered-template"),
    /not found/,
  );
});

test("email previews escape inserted content and strip newlines from subjects", () => {
  const rendered = renderEmailTemplate(
    { subject: "Reply: {{subject}}", body: "{{message}}" },
    {
      subject: "Test\r\nBcc: injected",
      message: '<script>alert("test")</script>',
    },
  );
  assert.doesNotMatch(rendered.subject, /[\r\n]/);
  assert.doesNotMatch(rendered.html, /<script>/);
  assert.match(rendered.html, /&lt;script&gt;/);
  assert.equal(rendered.text, '<script>alert("test")</script>');
});
