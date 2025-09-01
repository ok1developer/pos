import Image from 'next/image';

export default function SuccessScreen({ amount }: { amount: number }) {
  return (
    <div className="w-full h-full flex flex-col justify-center items-center text-center p-8 bg-transparent">
      <Image src="https://no1.email/upload-image/success.gif" alt="Success" width={300} height={300} unoptimized />
      <p className="text-4xl font-bold text-gray-800 mt-5">
        ชำระเงินสำเร็จ: {amount.toFixed(2)} บาท
      </p>
      <p className="text-4xl font-bold text-gray-800 mt-3">
        ขอบคุณที่ใช้บริการค่ะ
      </p>
    </div>
  );
}