"use client";

import Link from "next/link";
import { useState } from "react";
import { simulateForPromo, useAcceptPromo, useDismissPromo, useProduct, usePromoForProduct, useTrend } from "@/lib/api/hooks";
import { useEffectiveBranch } from "@/components/layout/BranchSelect";
import { copy } from "@/lib/copy";
import { formatDate, formatMoney, formatSignedMoney } from "@/lib/format";
import { calendarHref } from "@/lib/links";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { TrendChart } from "./TrendChart";
import { PromoSimulator } from "./PromoSimulator";

const P = copy.product;

export function ProductDetail({ productId }: { productId: string }) {
  const branch = useEffectiveBranch();
  const product = useProduct(productId);
  const promo = usePromoForProduct(productId, branch);
  const [discount, setDiscount] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const accept = useAcceptPromo();
  const dismiss = useDismissPromo();
  const toast = useToast();

  const promoData = promo.data;
  const activeDiscount = discount ?? promoData?.discountPct ?? 0;
  const trendBranch = promoData?.branchId ?? branch;
  const trend = useTrend(productId, trendBranch, promoData ? activeDiscount : undefined);

  const back = (
    <Link href="/" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary hover:underline">
      <span aria-hidden>←</span> {P.back}
    </Link>
  );

  if (product.isError || promo.isError) return <>{back}<ErrorState onRetry={() => { product.refetch(); promo.refetch(); }} /></>;
  if (product.isPending) return <>{back}<Skeleton className="h-96 w-full rounded-2xl" /></>;
  if (!product.data) {
    return (
      <>
        {back}
        <EmptyState title={copy.common.notFoundTitle} text={P.notFound} action={<Link href="/" className="mt-2 font-bold text-primary underline">{copy.common.backToDashboard}</Link>} />
      </>
    );
  }

  const prod = product.data;
  const gain = promoData ? simulateForPromo(promoData.id, activeDiscount) : null;
  const window = promoData ? { start: promoData.startDate, end: promoData.endDate } : null;
  const pending = promoData?.status === "pending";

  async function onAccept() {
    if (!promoData) return;
    await accept.mutateAsync({ id: promoData.id, discountPct: activeDiscount });
    setConfirm(false);
    toast.show(P.acceptedToast);
  }
  async function onDismiss() {
    if (!promoData) return;
    await dismiss.mutateAsync(promoData.id);
    toast.show(P.dismissedToast);
  }

  return (
    <div className="flex flex-col gap-6">
      {back}
      <PageHeader title={prod.name} subtitle={`${P.cat}: ${prod.category} · SKU ${prod.sku}`}>
        {promoData?.status === "accepted" && <Badge tone="green">{P.acceptedBadge}</Badge>}
        {promoData?.status === "dismissed" && <Badge tone="gray">{P.dismissedBadge}</Badge>}
      </PageHeader>

      <PromoSimulator
        product={prod}
        promo={promoData ?? null}
        discount={activeDiscount}
        onDiscount={setDiscount}
        chart={
          <Card>
            {trend.isPending ? (
              <Skeleton className="h-[300px]" />
            ) : trend.isError ? (
              <ErrorState onRetry={() => trend.refetch()} />
            ) : (
              <TrendChart points={trend.data} window={window} withPromo={!!promoData} />
            )}
          </Card>
        }
      />

      {promoData ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setConfirm(true)} disabled={!pending}>{P.acceptBtn}</Button>
          <Button variant="secondary" onClick={onDismiss} disabled={!pending || dismiss.isPending}>{P.dismissBtn}</Button>
          <Link
            href={calendarHref({ productId })}
            className="inline-flex min-h-11 items-center rounded-[10px] border border-line bg-white px-4 text-sm font-semibold hover:bg-background"
          >
            {copy.common.viewInCalendar}
          </Link>
          <span className="text-sm text-muted">
            {formatDate(promoData.startDate)} – {formatDate(promoData.endDate)}
          </span>
        </div>
      ) : (
        <EmptyState title={P.promoTitle} text={P.noPromo} />
      )}

      {promoData && (
        <Modal
          open={confirm}
          onClose={() => setConfirm(false)}
          title={P.confirmTitle}
          width="max-w-md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirm(false)}>{copy.common.cancel}</Button>
              <Button onClick={onAccept} disabled={accept.isPending}>{P.acceptBtn}</Button>
            </>
          }
        >
          <p className="text-sm leading-relaxed">{P.confirmText(activeDiscount, formatDate(promoData.startDate), formatDate(promoData.endDate))}</p>
          {gain && (
            <p className="mt-3 text-sm font-bold text-primary">
              {formatMoney(gain.without.netProfit)} → {formatMoney(gain.with.netProfit)} ({formatSignedMoney(gain.with.netProfit - gain.without.netProfit)})
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
