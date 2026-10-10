"use client";

import { useState, type FormEvent } from "react";
import { useAddSupplier, useSaveSupplier, useSendTestEmail, useSuppliers } from "@/lib/api/hooks";
import { copy } from "@/lib/copy";
import { formatMoney, formatPct } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import type { Supplier } from "@/types";

const S = copy.suppliers;

type Form = { name: string; email: string; leadTimeDays: string; deliveryDays: string; minOrderValue: string; fillRate: string };
type Errors = Partial<Record<keyof Form, string>>;

const toForm = (s: Supplier): Form => ({
  name: s.name,
  email: s.email,
  leadTimeDays: String(s.leadTimeDays),
  deliveryDays: s.deliveryDays,
  minOrderValue: String(s.minOrderValue),
  fillRate: String(Math.round(s.fillRate * 100)),
});
const blank: Form = { name: "", email: "", leadTimeDays: "2", deliveryDays: "Lun/Jue", minOrderValue: "2000", fillRate: "90" };

function validate(f: Form): Errors {
  const e: Errors = {};
  if (!f.name.trim()) e.name = S.errors.name;
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = S.errors.email;
  const num = (v: string) => v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 0;
  if (!num(f.leadTimeDays)) e.leadTimeDays = S.errors.number;
  if (!num(f.minOrderValue)) e.minOrderValue = S.errors.number;
  if (!num(f.fillRate) || Number(f.fillRate) > 100) e.fillRate = S.errors.fill;
  if (!f.deliveryDays.trim()) e.deliveryDays = S.errors.name;
  return e;
}

export function SuppliersView() {
  const suppliers = useSuppliers();
  const save = useSaveSupplier();
  const add = useAddSupplier();
  const test = useSendTestEmail();
  const toast = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Form>(blank);
  const [errors, setErrors] = useState<Errors>({});
  const [confirmTest, setConfirmTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const selected = suppliers.data?.find((s) => s.id === selectedId) ?? null;

  const selectSupplier = (s: Supplier) => {
    setIsNew(false);
    setSelectedId(s.id);
    setForm(toForm(s));
    setErrors({});
    setTestResult(null);
  };

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      leadTimeDays: Number(form.leadTimeDays),
      deliveryDays: form.deliveryDays.trim(),
      minOrderValue: Number(form.minOrderValue),
      fillRate: Number(form.fillRate) / 100,
    };
    if (isNew) {
      const created = await add.mutateAsync(payload);
      selectSupplier(created);
      toast.show(S.created);
    } else if (selectedId) {
      await save.mutateAsync({ id: selectedId, patch: payload });
      toast.show(S.saved);
    }
  }

  async function onTest() {
    if (!selected) return;
    await test.mutateAsync(selected.email);
    setConfirmTest(false);
    setTestResult(S.resend.ok(selected.email));
  }

  const editing = isNew || !!selected;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={S.title} subtitle={S.subtitle}>
        <Button onClick={() => { setIsNew(true); setSelectedId(null); setForm(blank); setErrors({}); setTestResult(null); }}>{S.add}</Button>
      </PageHeader>

      {suppliers.isError ? (
        <ErrorState onRetry={() => suppliers.refetch()} />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[1.6fr_1fr]">
          <Card className="overflow-x-auto p-0">
            {suppliers.isPending ? (
              <div className="flex flex-col gap-2 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : suppliers.data.length === 0 ? (
              <EmptyState className="m-5" />
            ) : (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs font-semibold text-muted">
                    <th className="px-5 py-3">{S.cols.name}</th>
                    <th className="py-3 pr-3">{S.cols.email}</th>
                    <th className="py-3 pr-3">{S.cols.leadTime}</th>
                    <th className="py-3 pr-3">{S.cols.days}</th>
                    <th className="py-3 pr-3 text-right">{S.cols.minOrder}</th>
                    <th className="py-3 pr-5 text-right">{S.cols.fillRate}</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.data.map((s) => (
                    <tr key={s.id} className={`border-b border-line last:border-0 ${selectedId === s.id && !isNew ? "bg-primary-tint" : "hover:bg-background"}`}>
                      <td className="px-5 py-1">
                        <button
                          type="button"
                          aria-pressed={selectedId === s.id && !isNew}
                          onClick={() => selectSupplier(s)}
                          className="min-h-11 text-left font-bold hover:underline"
                        >
                          {s.name}
                        </button>
                      </td>
                      <td className="py-3 pr-3 text-muted">{s.email}</td>
                      <td className="py-3 pr-3">{s.leadTimeDays} {copy.calendar.days}</td>
                      <td className="py-3 pr-3">{s.deliveryDays}</td>
                      <td className="py-3 pr-3 text-right">{formatMoney(s.minOrderValue)}</td>
                      <td className="py-3 pr-5 text-right font-semibold">{formatPct(s.fillRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <h2 className="mb-4 text-lg font-extrabold">{isNew ? S.add : S.edit}</h2>
              {editing ? (
                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
                  <Field id="sup-name" label={S.fields.name} value={form.name} error={errors.name} onChange={set("name")} />
                  <Field id="sup-email" type="email" label={S.fields.email} value={form.email} error={errors.email} onChange={set("email")} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field id="sup-lead" type="number" min={0} label={S.fields.leadTime} value={form.leadTimeDays} error={errors.leadTimeDays} onChange={set("leadTimeDays")} />
                    <Field id="sup-days" label={S.fields.days} value={form.deliveryDays} error={errors.deliveryDays} onChange={set("deliveryDays")} />
                    <Field id="sup-min" type="number" min={0} label={S.fields.minOrder} value={form.minOrderValue} error={errors.minOrderValue} onChange={set("minOrderValue")} />
                    <Field id="sup-fill" type="number" min={0} max={100} label={S.fields.fillRate} value={form.fillRate} error={errors.fillRate} onChange={set("fillRate")} />
                  </div>
                  <div className="mt-1 flex gap-2">
                    <Button type="submit" disabled={save.isPending || add.isPending}>{copy.common.save}</Button>
                    <Button
                      variant="secondary"
                      onClick={() => { setIsNew(false); if (selected) { setForm(toForm(selected)); setErrors({}); } else setSelectedId(null); }}
                    >
                      {copy.common.cancel}
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-muted">{S.selectHint}</p>
              )}
            </Card>

            <Card className="border-primary/30 bg-primary-tint/40">
              <div className="flex items-center gap-2">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-primary" />
                <h2 className="text-base font-extrabold">{S.resend.title}</h2>
              </div>
              <p className="mt-1 text-sm text-muted">{S.resend.text}</p>
              <Button variant="secondary" size="sm" className="mt-3" disabled={!selected || isNew} onClick={() => setConfirmTest(true)}>
                {S.resend.test}
              </Button>
              {testResult && <p role="status" className="mt-3 text-sm font-semibold text-primary">{testResult}</p>}
            </Card>
          </div>
        </div>
      )}

      <Modal
        open={confirmTest}
        onClose={() => setConfirmTest(false)}
        title={S.resend.confirmTitle}
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmTest(false)}>{copy.common.cancel}</Button>
            <Button onClick={onTest} disabled={test.isPending}>{test.isPending ? S.resend.sending : S.resend.test}</Button>
          </>
        }
      >
        {selected && <p className="text-sm">{S.resend.confirmText(selected.email)}</p>}
      </Modal>
    </div>
  );
}
