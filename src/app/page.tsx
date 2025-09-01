'use client'; // บอก Next.js ว่านี่คือ Client Component

import { useState, useEffect, useRef, useCallback } from 'react';
import WaitingSlider from '@/components/WaitingSlider';
import QrCodeScreen from '@/components/QrCodeScreen';
import FacebookFeed from '@/components/FacebookFeed';
import SuccessScreen from '@/components/SuccessScreen';
import CancelScreen from '@/components/CancelScreen';

// --- Type Definitions ---
// ... (เหมือนเดิม) ...
type PaymentStatus = 'waiting' | 'qr_code' | 'success' | 'cancelled' | 'timeout';
interface PaymentData {
  id: string;
  amount: string;
  date: string;
  status: 'รอการชำระ' | 'ชำระแล้ว' | 'ยกเลิก';
}
interface SmsTransaction {
  id: string;
  amount: string;
  received_at: string;
  status?: 'ยืนยันแล้ว';
}

// --- Main Component ---
export default function PaymentPage() {
  // --- State สำหรับ Scaling ---
  const [scaleStyle, setScaleStyle] = useState({});

  // --- Logic ทั้งหมดของแอป (เหมือนเดิม) ---
  const [appState, setAppState] = useState<PaymentStatus>('waiting');
  // ... (State อื่นๆ เหมือนเดิม) ...
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [countdown, setCountdown] = useState<string>('');

  const intervalsRef = useRef<NodeJS.Timeout[]>([]);
  const preloadedAudioUrl = useRef<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // --- useEffect สำหรับคำนวณ Scale ---
  useEffect(() => {
    const handleResize = () => {
      const scaleX = window.innerWidth / 1920;
      const scaleY = window.innerHeight / 1080;
      setScaleStyle({
        '--scale-x': scaleX,
        '--scale-y': scaleY,
      } as React.CSSProperties);
    };

    // คำนวณครั้งแรกเมื่อโหลดหน้า
    handleResize();

    // เพิ่ม event listener เพื่อคำนวณใหม่เมื่อขนาดจอเปลี่ยน
    window.addEventListener('resize', handleResize);

    // Cleanup function เพื่อลบ event listener ออกเมื่อ component ถูกทำลาย
    return () => window.removeEventListener('resize', handleResize);
  }, []); // ทำงานแค่ครั้งเดียวตอน mount

  // --- Utility & API Functions (เหมือนเดิม) ---
  // ... (คัดลอกฟังก์ชันทั้งหมดมาวางที่นี่: convertNumberToThaiText, fetchWithNoCache, etc.) ...
  const convertNumberToThaiText = useCallback((numStr: string): string => {
    const num = parseInt(numStr, 10);
    if (isNaN(num)) return "";
    const txtNumArr = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const txtDigitArr = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
    let result = '';
    const numberStr = num.toString();
    const len = numberStr.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(numberStr[i]);
      const position = len - i - 1;
      let digitText = txtNumArr[digit];
      const unitText = txtDigitArr[position % 6];
      if (position % 6 === 0 && i !== 0 && digit === 1) digitText = 'เอ็ด';
      if (position % 6 === 1 && digit === 2) digitText = 'ยี่';
      if (position % 6 === 1 && digit === 1) digitText = '';
      if (digit !== 0) result += digitText + unitText;
    }
    return result;
  }, []);

  const fetchWithNoCache = (url: string, options?: RequestInit) => {
    return fetch(url, { ...options, cache: 'no-store' });
  };
  
  const updatePaymentStatus = async (docId: string, status: 'ชำระแล้ว' | 'ยกเลิก') => {
    try {
      await fetchWithNoCache(`${process.env.NEXT_PUBLIC_PAYMENT_API_URL}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: docId, status }),
      });
      console.log(`Payment status updated to '${status}' for document:`, docId);
    } catch (error) { console.error("Error updating payment status:", error); }
  };
  
  const updateSmsStatus = async (txId: string) => {
    try {
      await fetchWithNoCache(`${process.env.NEXT_PUBLIC_SMS_API_URL}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: txId, status: "ยืนยันแล้ว" }),
      });
      console.log("SMS status updated for transaction:", txId);
    } catch (error) { console.error("Error updating SMS status:", error); }
  };

  const preloadSpeakAmount = useCallback(async (amountStr: string) => {
      const thaiText = convertNumberToThaiText(amountStr);
      if (!thaiText) return;
      const fullText = `รับยอด ${thaiText} บาท ขอบคุณที่ใช้บริการโอเคโมบายค่ะ`;
      try {
        const response = await fetch(process.env.NEXT_PUBLIC_TTS_API_URL!, {
          method: 'POST', headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: fullText }),
        });
        const audioData = await response.arrayBuffer();
        const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
        if (preloadedAudioUrl.current) URL.revokeObjectURL(preloadedAudioUrl.current);
        preloadedAudioUrl.current = URL.createObjectURL(audioBlob);
        console.log("TTS preloaded");
      } catch (error) { console.error('Error preloading TTS:', error); }
  }, [convertNumberToThaiText]);

  const resetToWaitingState = useCallback(() => {
    console.log("Resetting to waiting state...");
    clearAllIntervals();
    setAppState('waiting');
    setPaymentData(null);
    setQrCodeUrl('');
    setCountdown('');
    if (preloadedAudioUrl.current) {
      URL.revokeObjectURL(preloadedAudioUrl.current);
      preloadedAudioUrl.current = null;
    }
  }, []);

  const playPreloadedSpeakAmount = useCallback(() => {
    if (preloadedAudioUrl.current) {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio();
        document.body.appendChild(audioPlayerRef.current);
      }
      audioPlayerRef.current.src = preloadedAudioUrl.current;
      audioPlayerRef.current.play();
      audioPlayerRef.current.onended = () => resetToWaitingState();
    }
  }, [resetToWaitingState]);

  const playInitialSound = useCallback(() => {
    return new Promise<void>((resolve) => {
      const audio = new Audio(process.env.NEXT_PUBLIC_CASHIER_SOUND_URL!);
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play();
    });
  }, []);

  const clearAllIntervals = () => {
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];
  };
  
  useEffect(() => {
    if (appState !== 'waiting') return;
    const paymentCheckInterval = setInterval(async () => {
      try {
        const response = await fetchWithNoCache(process.env.NEXT_PUBLIC_PAYMENT_API_URL!);
        const data = await response.json();
        if (data && data.status === "รอการชำระ" && data.amount && data.date) {
          const startTime = new Date(data.date);
          const deadline = new Date(startTime.getTime() + 3 * 60 * 1000);
          if (new Date() < deadline) {
            setPaymentData(data as PaymentData);
            setAppState('qr_code');
          }
        }
      } catch (err) { /* console.error("Error polling for payment:", err) */ }
    }, 2000);
    intervalsRef.current.push(paymentCheckInterval);
    return () => clearInterval(paymentCheckInterval);
  }, [appState]);

  useEffect(() => {
    if (appState !== 'qr_code' || !paymentData) return;
    let isMounted = true;
    const generateQR = async () => {
      const expectedAmount = parseFloat(paymentData.amount) || 0;
      const apiUrl = `${process.env.NEXT_PUBLIC_QR_CODE_API_URL}?amount=${expectedAmount}`;
      try {
        const response = await fetchWithNoCache(apiUrl);
        const svgText = await response.text();
        const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
        if (isMounted) {
            setQrCodeUrl(prevUrl => {
                if(prevUrl) URL.revokeObjectURL(prevUrl);
                return URL.createObjectURL(svgBlob)
            });
        }
        preloadSpeakAmount(paymentData.amount);
      } catch (err) { console.error("Error fetching QR Code:", err); }
    };
    generateQR();

    const startTime = new Date(paymentData.date);
    const deadline = new Date(startTime.getTime() + 3 * 60 * 1000);
    const countdownInterval = setInterval(() => {
      const now = new Date();
      const remaining = deadline.getTime() - now.getTime();
      if (remaining <= 0) {
        setAppState('timeout');
      } else {
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        if (isMounted) setCountdown(`${minutes} นาที ${seconds.toString().padStart(2, '0')} วินาที`);
      }
    }, 1000);

    const successCheckInterval = setInterval(async () => {
      try {
        const response = await fetchWithNoCache(process.env.NEXT_PUBLIC_SMS_API_URL!);
        const transactions = await response.json() as SmsTransaction[];
        const expectedAmount = parseFloat(paymentData.amount);
        for (const tx of transactions) {
          if (tx.status === "ยืนยันแล้ว") continue;
          const txAmount = tx.amount || 0; // <-- แก้ไขตรงนี้
      const receivedAt = new Date(tx.received_at); // <-- แก้ไขตรงนี้
          if (txAmount === expectedAmount && receivedAt >= startTime && receivedAt <= deadline) {
            setAppState('success');
            await updatePaymentStatus(paymentData.id, 'ชำระแล้ว');
            await updateSmsStatus(tx.id);
            return;
          }
        }
      } catch (err) { /* console.error("Error polling for success:", err) */ }
    }, 2000);

    const cancelCheckInterval = setInterval(async () => {
        try {
            const response = await fetchWithNoCache(`${process.env.NEXT_PUBLIC_PAYMENT_API_URL_POS}?id=${paymentData.id}`);
            const latestPaymentData = await response.json();
            if (latestPaymentData && latestPaymentData.status === "ยกเลิก") {
                setAppState('cancelled');
            }
        } catch (err) { /* console.error("Error polling for cancel:", err) */ }
    }, 2000);
    
    intervalsRef.current.push(countdownInterval, successCheckInterval, cancelCheckInterval);

    return () => {
      isMounted = false;
      clearAllIntervals();
    };
  }, [appState, paymentData, preloadSpeakAmount]);

  useEffect(() => {
    if (appState === 'success') {
      clearAllIntervals();
      playInitialSound().then(() => playPreloadedSpeakAmount());
    }
    if (appState === 'cancelled' || appState === 'timeout') {
      clearAllIntervals();
      const timeout = setTimeout(resetToWaitingState, appState === 'cancelled' ? 5000 : 2000);
      return () => clearTimeout(timeout);
    }
  }, [appState, playInitialSound, playPreloadedSpeakAmount, resetToWaitingState]);

  // --- Render Logic (เหมือนเดิม) ---
  const renderContent = () => {
    switch (appState) {
      case 'qr_code':
        if (!paymentData) return null;
        return <QrCodeScreen qrCodeUrl={qrCodeUrl} amount={parseFloat(paymentData.amount) || 0} countdown={countdown}/>;
      case 'success':
        return <SuccessScreen amount={parseFloat(paymentData?.amount || '0')} />;
      case 'cancelled':
        return <CancelScreen />;
      case 'timeout':
        return <div className="w-full h-full bg-transparent" />;
      case 'waiting':
      default:
        return <WaitingSlider />;
    }
  };

  const youtubeUrl = `https://www.youtube.com/embed/videoseries?list=${process.env.NEXT_PUBLIC_YOUTUBE_PLAYLIST_ID}&autoplay=1&mute=1&loop=1&controls=0&playlist=${process.env.NEXT_PUBLIC_YOUTUBE_FIRST_VIDEO_ID}`;

  return (
    // --- นี่คือส่วนที่แก้ไข ---
    <div className="fixed-resolution-wrapper" style={scaleStyle}>
      <main className="scaled-content flex bg-white">
        
        {/* คอลัมน์ซ้าย (960px) */}
        <div className="w-[960px] h-full flex flex-col">
          {/* ส่วนวิดีโอ (540px) */}
          <div className="h-[540px]">
            <iframe
              className="w-full h-full"
              src={youtubeUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
          
          {/* ส่วน Facebook Feed (พื้นที่ที่เหลือ) */}
          <div className="flex-grow">
            <FacebookFeed />
          </div>
        </div>

        {/* คอลัมน์ขวา (960px) */}
        <div className="w-[960px] h-full relative ">
          {renderContent()}
        </div>

      </main>
    </div>
  );
}
