// src/components/QrCodeScreen.tsx
import Image from 'next/image';

interface QrCodeScreenProps {
  qrCodeUrl: string;
  amount: number;
  countdown: string;
}

export default function QrCodeScreen({ qrCodeUrl, amount, countdown }: QrCodeScreenProps) {
  return (
    <div
      className="w-full h-full flex flex-col justify-center items-center text-center p-8 bg-no-repeat bg-top bg-cover"
      style={{ backgroundImage: "url('https://lh3.googleusercontent.com/d/1LhZHKNaabdD9YDgzsJFgaeA5GiMggZVK')" }}
    >
      {/* --- 1. ปรับตำแหน่งโดยรวมให้ต่ำลงเล็กน้อย --- */}
      <div className="transform -translate-y-16">
        {qrCodeUrl && <Image src={qrCodeUrl} alt="PromptPay QR Code" width={500} height={500} />}

        <div className="mt-4 font-bold">
          {/* --- 2. เปลี่ยนสี "ยอดชำระ" เป็นสีดำ --- */}
          <p className="text-4xl text-black">
            <span>ยอดชำระ:</span>
            {/* สีของยอดเงินยังเป็นสีน้ำเงินได้เพื่อความโดดเด่น */}
            <span className="text-blue-600 mx-2">{amount.toFixed(2)}</span>
            <span>บาท</span>
          </p>
        </div>

        {/* --- 3. เปลี่ยนสี "ชำระภายใน" และ Loader เป็นสีแดง --- */}
        <div className="mt-4 flex items-center justify-center text-pink-600 text-3xl">
      <p>ชำระภายใน: <span className="ml-2">{countdown}</span></p>
      
      <svg viewBox="25 25 50 50" className="w-[20px] h-[20px] ml-3 loader-circle">
        <circle cx="50" cy="50" r="20" className="fill-none stroke-current stroke-[4px] loader-path"></circle>
      </svg>
    </div>
      </div>
    </div>
  );
}