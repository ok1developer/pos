// src/app/api/facebook-posts/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
  const ACCESS_TOKEN = process.env.FACEBOOK_APP_ACCESS_TOKEN;

  if (!PAGE_ID || !ACCESS_TOKEN) {
    return NextResponse.json(
      { error: 'Facebook environment variables not set' },
      { status: 500 }
    );
  }

  // Fields คือข้อมูลที่เราต้องการจากแต่ละโพสต์
  const fields = 'id,message,created_time,full_picture,permalink_url';
  const limit = 10; // ดึงมา 5 โพสต์ล่าสุด
  const url = `https://graph.facebook.com/v20.0/${PAGE_ID}/posts?fields=${fields}&limit=${limit}&access_token=${ACCESS_TOKEN}`;

  try {
    const response = await fetch(url, {
      // ดึงข้อมูลใหม่ทุกๆ 1 ชั่วโมง (3600 วินาที) เพื่อประสิทธิภาพ
      next: { revalidate: 3600 }, 
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Facebook API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch data from Facebook' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Internal Server Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}