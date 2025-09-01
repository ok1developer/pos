// src/components/FacebookFeed.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import FormattedMessage from './FormattedMessage';

interface Post {
  id: string;
  message?: string;
  created_time: string;
  full_picture?: string;
  permalink_url: string;
}

const SLIDE_DURATION = 8000;

export default function FacebookFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // ... (useEffect เดิม) ...
    async function fetchPosts() {
      try {
        const response = await fetch('/api/facebook-posts');
        if (!response.ok) {
          throw new Error('ไม่สามารถดึงข้อมูลโพสต์ได้');
        }
        const data = await response.json();
        const postsWithPictures = (data.data || []).filter((post: Post) => post.full_picture);
        setPosts(postsWithPictures);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  useEffect(() => {
    // ... (useEffect เดิม) ...
    if (posts.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % posts.length);
      }, SLIDE_DURATION);
      return () => clearInterval(interval);
    }
  }, [posts]);

  if (loading) {
    return <div className="p-4 text-center text-white bg-black h-full flex items-center justify-center text-[38px]">กำลังโหลดโพสต์...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-400 bg-black h-full flex items-center justify-center">เกิดข้อผิดพลาด: {error}</div>;
  }

  if (posts.length === 0) {
    return <div className="p-4 text-center text-white bg-black h-full flex items-center justify-center">ไม่พบโพสต์ที่มีรูปภาพ</div>;
  }

  return (
    <div className="relative w-full h-full bg-black">
      {posts.map((post, index) => (
        <div
          key={post.id}
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="relative w-full  mx-auto h-[540px]">
            
            <div className="absolute top-0 left-0 w-[540px] h-full">
              <Image
                src={post.full_picture!}
                alt={post.message?.substring(0, 50) || 'Facebook Post Image'}
                fill
                className="object-cover"
                priority={index === 0}
                unoptimized
              />
            </div>

            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to right, transparent 450px, black 535px)'
              }}
            >
              <div className="absolute top-0 bottom-0 left-[540px] right-0 flex flex-col p-[10px]">
                
                {/* --- นี่คือส่วนที่แก้ไข --- */}
                {/* 1. Container ที่มี overflow-hidden เพื่อ "ตัด" ข้อความที่อยู่นอกกรอบ */}
                <div className="flex-grow overflow-hidden relative text-lg text-white leading-relaxed">
                  {/* 2. ตัวข้อความที่จะถูก animate */}
                  <div
                    key={currentIndex} 
                    className="absolute inset-0 animate-slide-in-out"
                    style={{ animationDuration: `${SLIDE_DURATION}ms` }}
                  >
                    <p className="text-sm text-neutral-300 mb-4">
                      {format(new Date(post.created_time), 'd MMMM yyyy, HH:mm', { locale: th })}
                    </p>
                    {post.message && <FormattedMessage text={post.message} />}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      ))}
    </div>
  );
}