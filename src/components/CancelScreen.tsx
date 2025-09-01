import Image from 'next/image';

export default function CancelScreen() {
  return (
    <div className="w-full h-full flex flex-col justify-center items-center text-center p-8 bg-transparent">
      <Image src="https://no1.email/upload-image/cancel.gif" alt="ยกเลิกรายการ" width={300} height={300} unoptimized />
      <p className="text-4xl font-bold text-gray-800 mt-5">
        ยกเลิกการชำระ
      </p>
    </div>
  );
}