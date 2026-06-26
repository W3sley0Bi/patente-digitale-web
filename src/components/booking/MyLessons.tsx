import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cancelBooking, listMyBookings } from "@/lib/booking/api";
import { effectiveStatus, isCancellable } from "@/lib/booking/helpers";
import type { Booking } from "@/lib/booking/types";

export function MyLessons({ refreshKey = 0 }: { refreshKey?: number }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Booking[]>([]);
  const load = () => listMyBookings().then(setItems).catch(() => setItems([]));
  useEffect(() => { void load(); }, [refreshKey]);

  const cancel = async (b: Booking) => {
    const reason = window.prompt(t("booking.mine.cancelReason")) ?? undefined;
    await cancelBooking(b.id, reason); await load();
  };

  return (
    <div className="rounded-2xl border border-line bg-bg-raised p-6">
      <h3 className="font-sans text-lg font-black text-ink">{t("booking.mine.title")}</h3>
      <ul className="mt-4 divide-y divide-line">
        {items.map((b) => {
          const st = effectiveStatus(b);
          return (
            <li key={b.id} className="flex items-center justify-between py-3 text-sm">
              <span className="text-ink">{new Date(b.starts_at).toLocaleString()}</span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-ink-muted">{t(`booking.mine.status.${st}`)}</span>
                {isCancellable(b) && (
                  <button type="button" onClick={() => cancel(b)}
                    className="rounded-md border border-line px-3 py-1 text-xs">{t("booking.mine.cancel")}</button>
                )}
              </span>
            </li>
          );
        })}
        {items.length === 0 && <li className="py-3 text-sm text-ink-faint">{t("booking.mine.empty")}</li>}
      </ul>
    </div>
  );
}
