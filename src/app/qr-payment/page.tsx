// Make sure this is a client component
"use client";

import "@/app/globals.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiCheck,
  FiClock,
  FiCopy,
  FiCreditCard,
  FiLoader,
  FiRefreshCw,
  FiX,
  FiCheckCircle,
  FiAlertTriangle,
  FiInfo,
} from "react-icons/fi";

/* =========================
   Types
========================= */
interface HistoryItem {
  id: number;
  date: string;
  uniqid: string;
  amount: number;
  note: string;
  status: "รอการชำระ" | "ชำระแล้ว" | "ยกเลิก" | string;
}

interface PaymentDetails {
  docId: string;
  date: string;
  uniqid: string;
  amount: string;
  note: string;
  status: string;
}

type NotificationType = "success" | "error" | "info";
interface NotificationItem {
  id: number;
  message: string;
  type: NotificationType;
}

/* =========================
   Utils
========================= */
const THB = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
});

const cn = (...classes: (string | false | undefined)[]) =>
  classes.filter(Boolean).join(" ");

const getStatusClasses = (status: string): string => {
  switch (status) {
    case "รอการชำระ":
      return "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200";
    case "ชำระแล้ว":
      return "bg-green-100 text-green-800 ring-1 ring-green-200";
    case "ยกเลิก":
      return "bg-red-100 text-red-800 ring-1 ring-red-200";
    default:
      return "bg-gray-100 text-gray-800 ring-1 ring-gray-200";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "รอการชำระ":
      return <FiClock className="h-4 w-4" />;
    case "ชำระแล้ว":
      return <FiCheck className="h-4 w-4" />;
    case "ยกเลิก":
      return <FiX className="h-4 w-4" />;
    default:
      return <FiAlertCircle className="h-4 w-4" />;
  }
};

/* =========================
   Component
========================= */
export default function QRPaymentPage() {
  // form state
  const [amount, setAmount] = useState<string>("1");
  const [note, setNote] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // data state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(
    null
  );

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const detailsRef = useRef<HTMLDivElement>(null);

  // quick chips
  const shortcutNotes = [
    "ขายเครื่อง",
    "ต่อดอก/ไถถอน",
    "ค่าซ่อม",
    "ค่าบริการ",
    "ติดฟิล์ม",
    "อุปกรณ์ชาร์จ",
    "หูฟัง",
    "แบตสำรอง",
    "อื่นๆ",
  ];

  const quickAmounts = ["100", "200", "500", "1000", "1500", "2000"];

  const addNotification = (message: string, type: NotificationType) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };


  /* =========================
     Fetch history (today)
  ========================= */
  const fetchHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      // ===== MODIFIED: Use environment variable =====
      const res = await fetch(`${process.env.NEXT_PUBLIC_HISTORY_API_URL}/`);
      if (!res.ok) throw new Error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ประวัติได้");
      const data: HistoryItem[] = await res.json();
      const today = new Date().toISOString().slice(0, 10);
      const todayItems = data
        .filter(
          (item) => new Date(item.date).toISOString().slice(0, 10) === today
        )
        .sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      setHistory(todayItems);
    } catch (e: any) {
      setHistoryError(e?.message || "เกิดข้อผิดพลาดในการดึงประวัติ");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  /* =========================
     Polling status while pending
  ========================= */
  useEffect(() => {
    if (!paymentDetails || paymentDetails.status !== "รอการชำระ") return;

    let stop = false;
    const controller = new AbortController();

    const poll = async () => {
      try {
        // ===== MODIFIED: Use environment variable =====
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_PAYMENT_API_URL_POS}/?id=${paymentDetails.docId}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("โพลล์สถานะไม่สำเร็จ");
        const data = await res.json();

        if (data?.status && data.status !== paymentDetails.status) {
          setPaymentDetails((prev) => (prev ? { ...prev, status: data.status } : prev));

          if (data.status === "ชำระแล้ว") {
            addNotification("การชำระเงินสำเร็จแล้ว!", "success");
            stop = true;
            await fetchHistory();
          }
          if (data.status === "ยกเลิก") {
            addNotification("รายการถูกยกเลิกแล้ว", "info");
            stop = true;
            await fetchHistory();
          }
        }
      } catch {
        // เงียบไว้เพื่อไม่กวนผู้ใช้
      } finally {
        if (!stop) setTimeout(poll, 1000);
      }
    };

    poll();

    const handleVisibility = () => {
      if (document.hidden) controller.abort();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop = true;
      controller.abort();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [paymentDetails]);

  /* =========================
     Handlers
  ========================= */
  const addNoteText = (text: string) => {
    setNote((prev) => (prev ? `${prev}, ${text}` : text));
  };

  // =======================================================================
  // ====================== START: EDITED FUNCTION =========================
  // =======================================================================
  const handleCreateQR = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      addNotification("กรุณาระบุจำนวนเงินที่ถูกต้อง", "error");
      return;
    }

    setIsLoading(true);

    // 1. สร้าง Payload โดยไม่ต้องมี uniqid เพราะฐานข้อมูลจะสร้างให้เอง
    const payload = {
      date: new Date().toISOString(),
      amount: parseFloat(amount),
      note,
      status: "รอการชำระ",
    };

    try {
      // 2. เรียก API
      const response = await fetch(`${process.env.NEXT_PUBLIC_PAYMENT_API_URL_POS}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        // ใช้ result.error เพราะ API เราส่งกลับมาเป็น { error: "..." }
        throw new Error(result?.error || "สร้าง QR Code ไม่สำเร็จ");
      }
      
      // 3. ตรวจสอบว่ามี result.data อยู่จริง
      if (result.data) {
        addNotification("สร้างคำขอชำระเงินสำเร็จ", "success");
        
        // 4. ตั้งค่า State โดยใช้ข้อมูลที่ได้รับกลับมาจาก API โดยตรง
        //    ซึ่งเป็น "Source of Truth" ที่ถูกต้องที่สุด
        setPaymentDetails({
          date: result.data.date,
          amount: String(result.data.amount), // แปลง number เป็น string ให้ตรงกับ Type
          note: result.data.note,
          status: result.data.status,
          docId: String(result.data.id), // <-- **แก้ไขจุดสำคัญ** แปลง number เป็น string
          uniqid: result.data.uniqid, // <-- ใช้ uniqid (UUID) ที่ฐานข้อมูลสร้างให้
        });

        setTimeout(() => {
          detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } else {
        throw new Error("API ไม่ได้ส่งข้อมูลกลับมาอย่างถูกต้อง");
      }

    } catch (e: any) {
      addNotification(e?.message || "ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "error");
    } finally {
      setIsLoading(false);
    }
  };
  // =======================================================================
  // ======================= END: EDITED FUNCTION ==========================
  // =======================================================================

  const handleCancelPayment = async () => {
    if (!paymentDetails) return;
    const confirmed = confirm("ยืนยันยกเลิกรายการนี้?");
    if (!confirmed) return;

    setIsLoading(true);
    try {
      // ===== MODIFIED: Use environment variable =====
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_PAYMENT_API_URL_POS}/?id=${paymentDetails.docId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ยกเลิก" }),
        }
      );
      if (!res.ok) throw new Error("ยกเลิกไม่สำเร็จ");
      addNotification("ยกเลิกรายการสำเร็จ", "success");
      setPaymentDetails((prev) => (prev ? { ...prev, status: "ยกเลิก" } : prev));
      await fetchHistory();
    } catch (e: any) {
      addNotification(e?.message || "ไม่สามารถยกเลิกรายการได้", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      addNotification("คัดลอกรหัสธุรกรรมแล้ว", "info");
    });
  };

  const formattedAmount = useMemo(() => {
    const n = Number(amount || 0);
    return isNaN(n) ? "-" : THB.format(n);
  }, [amount]);

  /* =========================
     UI
  ========================= */
  return (
    <>
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />

      {isLoading && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-white/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-lg ring-1 ring-slate-200">
            <FiLoader className="h-5 w-5 animate-spin" />
            <span className="font-medium text-slate-700">กำลังดำเนินการ...</span>
          </div>
        </div>
      )}

      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Header */}
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://lh3.googleusercontent.com/d/17Vu3ZVmOc-1wh3GofB7nOC3O28vFetL7"
                alt="OK Mobile"
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  ระบบ QR Payments: OK Mobile
                </h1>
              </div>
            </div>

            <button
              onClick={fetchHistory}
              className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              title="รีเฟรชประวัติวันนี้"
            >
              <FiRefreshCw className="h-4 w-4 group-active:rotate-180 transition" />
              รีเฟรช
            </button>
          </header>
          
          {/* ... Rest of the component remains unchanged ... */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Form */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <FiCreditCard className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  สร้างคำขอชำระเงิน
                </h2>
              </div>
              <div className="space-y-5">
                {/* Amount */}
                <div>
                  <label htmlFor="amount" className="mb-2 block text-sm font-semibold text-slate-700">
                    จำนวนเงิน
                  </label>
                  <div className="flex items-stretch gap-2">
                    <input
                      id="amount"
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                    <div className="whitespace-nowrap rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700">
                      {formattedAmount}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickAmounts.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAmount(v)}
                        className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-200"
                      >
                        {THB.format(Number(v))}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Note */}
                <div>
                  <label htmlFor="note" className="mb-2 block text-sm font-semibold text-slate-700">
                    รายการขายสินค้า (ระบุได้หลายรายการ)
                  </label>
                  <textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="เช่น iPhone 15 Pro 256GB สี Natural Titan, ฟิล์มกระจก"
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {shortcutNotes.map((text) => (
                      <button
                        key={text}
                        type="button"
                        onClick={() => addNoteText(text)}
                        className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleCreateQR}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 active:scale-[.99]"
                >
                  <FiCreditCard className="h-5 w-5" />
                  สร้าง QR Code / คำขอชำระ
                </button>
              </div>
            </div>
            {/* Payment Details */}
            <div ref={detailsRef} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                  <FiCheck className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  รายละเอียดการชำระเงิน
                </h2>
              </div>
              {!paymentDetails ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                  <p className="text-sm text-slate-500">
                    ยังไม่มีรายการที่กำลังดำเนินการ — สร้างคำขอชำระเพื่อเริ่มต้น
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoRow label="วันที่" value={new Date(paymentDetails.date).toLocaleString()} />
                    <InfoRow
                      label="จำนวนเงิน"
                      value={THB.format(parseFloat(paymentDetails.amount))}
                      emphasize
                    />
                
                    
                  </div>
                  <InfoRow
                      label="รหัสธุรกรรม"
                      value={
                        <span className="inline-flex items-center gap-2">
                          <span className="truncate">{paymentDetails.uniqid}</span>
                          <button
                            onClick={() => copy(paymentDetails.uniqid)}
                            className="rounded-md border border-slate-200 p-1 text-slate-600 hover:bg-slate-50"
                            title="คัดลอก"
                          >
                            <FiCopy className="h-4 w-4" />
                          </button>
                        </span>
                      }
                    />
                  <InfoRow label="หมายเหตุ" value={paymentDetails.note || "-"} />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      สถานะ:
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                        getStatusClasses(paymentDetails.status)
                      )}
                    >
                      {getStatusIcon(paymentDetails.status)}
                      {paymentDetails.status}
                    </span>
                    {paymentDetails.status === "รอการชำระ" && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-slate-500">
                        <FiLoader className="h-3.5 w-3.5 animate-spin" />
                        กำลังตรวจสอบการชำระทุก 5 วินาที
                      </span>
                    )}
                  </div>
                  {paymentDetails.status === "รอการชำระ" && (
                    <div className="pt-2">
                      <button
                        onClick={handleCancelPayment}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200 active:scale-[.99]"
                        title="ยกเลิกรายการนี้"
                      >
                        <FiX className="h-5 w-5" />
                        ยกเลิกรายการ
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
          {/* History Today */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                ประวัติการทำรายการ (วันนี้)
              </h2>
              <div className="text-xs text-slate-500">
                ทั้งหมด {history.length} รายการ
              </div>
            </div>
            <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
              <div className="max-h-[460px] overflow-auto">
                <table className="min-w-full">
                  <thead className="sticky top-0 bg-slate-50 text-left">
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <Th>ID</Th>
                      <Th>วันที่</Th>
                      <Th>รหัสธุรกรรม</Th>
                      <Th className="text-right">จำนวนเงิน</Th>
                      <Th>หมายเหตุ</Th>
                      <Th>สถานะ</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {historyLoading && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-sm text-slate-500">
                          <span className="inline-flex items-center gap-2">
                            <FiLoader className="h-4 w-4 animate-spin" />
                            กำลังโหลดข้อมูล...
                          </span>
                        </td>
                      </tr>
                    )}
                    {historyError && !historyLoading && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-sm text-red-600">
                          {historyError}
                        </td>
                      </tr>
                    )}
                    {!historyLoading && !historyError && history.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-sm text-slate-500">
                          ไม่มีข้อมูลสำหรับวันนี้
                        </td>
                      </tr>
                    )}
                    {!historyLoading &&
                      !historyError &&
                      history.map((item) => (
                        <tr key={item.id} className="text-sm">
                          <Td className="font-mono text-slate-500">{item.id}</Td>
                          <Td className="text-slate-900">
                            {new Date(item.date).toLocaleString()}
                          </Td>
                          <Td className="text-slate-600">{item.uniqid}</Td>
                          <Td className="text-right font-semibold text-slate-900">
                            {THB.format(Number(item.amount || 0))}
                          </Td>
                          <Td className="max-w-[360px] truncate text-slate-600" title={item.note}>
                            {item.note}
                          </Td>
                          <Td>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                                getStatusClasses(item.status)
                              )}
                            >
                              {getStatusIcon(item.status)}
                              {item.status}
                            </span>
                          </Td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
          {/* Tiny footer */}
          <footer className="pb-4 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} OK Mobile
          </footer>
        </div>
      </main>
    </>
  );
}

/* =========================
   Small UI helpers
========================= */
function InfoRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: React.ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-sm text-slate-800",
          emphasize && "text-base font-bold text-blue-700"
        )}
      >
        {value}
      </div>
    </div>
  );
}

type ThProps = React.ThHTMLAttributes<HTMLTableHeaderCellElement> & {
  className?: string;
};
function Th({ children, className = "", ...rest }: ThProps) {
  return (
    <th className={cn("px-4 py-3", className)} {...rest}>
      {children}
    </th>
  );
}

type TdProps = React.TdHTMLAttributes<HTMLTableCellElement> & {
  className?: string;
};
function Td({ children, className = "", ...rest }: TdProps) {
  return (
    <td className={cn("px-4 py-3 align-top", className)} {...rest}>
      {children}
    </td>
  );
}

/* =========================
   Notification Components
========================= */
function NotificationContainer({
  notifications,
  onRemove,
}: {
  notifications: NotificationItem[];
  onRemove: (id: number) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-3 w-80">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function NotificationToast({
  notification,
  onRemove,
}: {
  notification: NotificationItem;
  onRemove: (id: number) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
      const removeTimer = setTimeout(() => onRemove(notification.id), 300);
      return () => clearTimeout(removeTimer);
    }, 1000);

    return () => clearTimeout(exitTimer);
  }, [notification.id, onRemove]);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(notification.id), 300);
  };

  const notificationStyles = {
    success: {
      bg: "bg-green-50",
      text: "text-green-800",
      icon: <FiCheckCircle className="text-green-500" />,
      border: "border-green-200",
    },
    error: {
      bg: "bg-red-50",
      text: "text-red-800",
      icon: <FiAlertTriangle className="text-red-500" />,
      border: "border-red-200",
    },
    info: {
      bg: "bg-blue-50",
      text: "text-blue-800",
      icon: <FiInfo className="text-blue-500" />,
      border: "border-blue-200",
    },
  };

  const styles = notificationStyles[notification.type];

  return (
    <div
      className={cn(
        "flex items-start gap-3 w-full rounded-xl p-4 shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-300 ease-out",
        styles.bg,
        styles.text,
        styles.border,
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        isExiting && "opacity-0 scale-95"
      )}
    >
      <div className="flex-shrink-0 text-xl">{styles.icon}</div>
      <p className="flex-grow text-sm font-semibold">{notification.message}</p>
      <button onClick={handleRemove} className="flex-shrink-0 text-slate-500 hover:text-slate-800">
        <FiX className="h-5 w-5" />
      </button>
    </div>
  );
}