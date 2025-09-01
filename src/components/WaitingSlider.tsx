import Image from 'next/image';
import { useState, useEffect, FC } from 'react';

// --- นำเข้า SVG เป็น React Components ---
import SunnyIcon from '@/icons/sunny.svg';
import PartlyCloudyIcon from '@/icons/partly-cloudy.svg';
import RainIcon from '@/icons/rain.svg';
import DefaultIcon from '@/icons/default.svg';

const SLIDES = [
  "/Ads QR 945.png",
  "/ADS QR1.png",
  "/ADS QR3.png",
  "/จอ SPayLater.png",
  "/จอ จำนำ iCloud.png",
  "/จอ ผ่อนมือถือ.png",
  "/จอ รับปิดยอด.png",
  "/จอ รีไฟแนนซ์ 1.png",
  "/จอ รีไฟแนนซ์ 2.png",
  "/จอ รีไฟแนนซ์ 3.png",
  "/จอ รีไฟแนนซ์ 4.png"
];

interface WttrInData {
  current_condition: {
    temp_C: string;
    weatherCode: string;
    weatherDesc: { value: string }[];
    weatherIconUrl: { value: string }[];
  }[];
}

// --- แก้ไขฟังก์ชันนี้ ให้ return เป็น Component ---
// FC<{ className?: string }> คือการบอกว่ามันคือ React Component ที่รับ className ได้
const getWeatherIcon = (code: string): FC<{ className?: string }> => {
  const codeNum = parseInt(code, 10);
  switch (codeNum) {
    case 113: // Sunny/Clear
      return SunnyIcon;
    case 116: // Partly cloudy
      return PartlyCloudyIcon;
    case 119: // Cloudy
    case 122: // Overcast
      return PartlyCloudyIcon;
    case 176: // Patchy rain nearby
    case 263: // Patchy light drizzle
    case 293: // Patchy light rain
    case 296: // Light rain
    case 353: // Light rain shower
      return RainIcon;
    default:
      return DefaultIcon;
  }
};

// Widget แสดงวันที่ เวลา และสภาพอากาศ
function WeatherDateTimeWidget() {
  const [dateTime, setDateTime] = useState(new Date());
  const [weather, setWeather] = useState<WttrInData | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      const city = 'Bangkok'; 
      const url = `https://wttr.in/${city}?format=j1`;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Weather data fetch failed");
        const data: WttrInData = await response.json();
        setWeather(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 900000);
    return () => clearInterval(weatherInterval);
  }, []);

  // --- ส่วนสำคัญ: ดึง Component ไอคอนมาเก็บในตัวแปร ---
  const IconComponent = weather ? getWeatherIcon(weather.current_condition[0].weatherCode) : null;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white backdrop-blur-sm">
      <div className="flex justify-between items-center">
        {/* ส่วนของวันที่และเวลา */}
        <div>
          <h1 className="text-2xl font-bold">
            {dateTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </h1>
          <p className="text-xs">
            {dateTime.toLocaleDateString('th-TH', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* ส่วนของสภาพอากาศ */}
        {weather && weather.current_condition && IconComponent && (
          <div className="text-right flex items-center gap-2">
            <div>
              <p className="text-2xl font-bold">{weather.current_condition[0].temp_C}°C</p>
              <p className="text-xs capitalize">{weather.current_condition[0].weatherDesc[0].value}</p>
            </div>
            
            {/* --- แก้ไขตรงนี้ --- */}
            {/* เรนเดอร์ Component ไอคอนโดยตรง และใส่ className ที่ต้องการ */}
            <IconComponent className="w-[40px] h-[40px] text-white" />
            
          </div>
        )}
      </div>
    </div>
  );
}


// คอมโพเนนต์หลัก WaitingSlider (เหมือนเดิม)
export default function WaitingSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full bg-black">
      {SLIDES.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt={`Slide ${index + 1}`}
          fill
          style={{ objectFit: 'cover' }}
          className={`transition-opacity duration-1000 ease-in-out object-top  ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
          priority={index === 0}
          unoptimized
        />
      ))}
      <WeatherDateTimeWidget />
    </div>
  );
}