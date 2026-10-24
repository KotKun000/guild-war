# guild-war-egg2k

เว็บวางแผน Guild War (Seven Knights Re:BIRTH) แบบส่วนตัวของกิลด์ EGG2K
Cloudflare Pages + Pages Functions + D1

## ความปลอดภัย
- ต้อง **Login Discord** (เฉพาะคนที่อยู่ใน whitelist / Discord server ที่กำหนด) **และ** ใส่ **รหัสกิลด์ทุกครั้ง** ที่เปิด/รีเฟรชหน้า
- ล็อคอัตโนมัติเมื่อไม่ได้ใช้งาน 30 นาที หรือครบ `UNLOCK_MINUTES`
- ใส่รหัสผิด 5 ครั้ง → ล็อคบัญชีนั้น 15 นาที (บันทึกใน log)
- เปลี่ยนรหัส → ทุกคนที่เปิดอยู่ถูกล็อคทันที
- ลิงก์แชร์ (`/#/t/<id>`, `/#/p/<id>`) ไม่มีข้อมูลในตัว ผู้เปิดต้อง login + ใส่รหัสก่อน
- ข้อมูลทั้งหมดอยู่หลัง API ที่ตรวจ session cookie (HttpOnly) + unlock token ที่ผูกกับ session
- แอดมิน: แบนสมาชิก, เตะทุกคนออก, ดูบันทึกการใช้งาน (login / ใส่รหัสผิด / ลบ / นำเข้า พร้อม IP)
- noindex, CSP, X-Frame-Options DENY

## ตั้งค่าครั้งแรก

1. **Discord App** — https://discord.com/developers/applications → New Application → OAuth2
   - คัดลอก Client ID / Client Secret
   - Redirects: `https://<โดเมน>/auth/callback` (และ `http://127.0.0.1:8788/auth/callback` ถ้าจะทดสอบ Discord จริงในเครื่อง)
2. **ติดตั้ง + D1**
   ```bash
   npm install
   npx wrangler login
   npx wrangler d1 create guild-war-egg2k   # ใส่ database_id ที่ได้ลงใน wrangler.toml
   npm run db:init:remote
   ```
3. **ตั้งค่าใน `wrangler.toml` `[vars]`**
   - `ADMIN_DISCORD_IDS` = Discord User ID ของแอดมิน (เปิด Developer Mode ใน Discord → คลิกขวาที่ชื่อ → Copy User ID)
   - `DISCORD_SERVER_ID` (ไม่บังคับ) = ให้ทุกคนใน Discord server กิลด์เข้าได้อัตโนมัติ
   - `DISCORD_ROLE_ID` (ไม่บังคับ) = ต้องมี role นี้ใน server ด้วย
   - ถ้าไม่ตั้ง server → แอดมินเพิ่มสมาชิกเองทีละคนด้วย Discord ID ในหน้าแอดมิน
4. **Deploy + secrets**
   ```bash
   npm run deploy
   npx wrangler pages secret put DISCORD_CLIENT_ID --project-name guild-war-egg2k
   npx wrangler pages secret put DISCORD_CLIENT_SECRET --project-name guild-war-egg2k
   npx wrangler pages secret put SESSION_SECRET --project-name guild-war-egg2k   # สุ่ม 64 ตัวอักษร
   npm run deploy
   ```
5. เปิดเว็บ → Login ด้วยบัญชีแอดมิน → ตั้งรหัสกิลด์ → หน้าแอดมิน → นำเข้าจาก 7k-note (`SExN7AHJ`)

## พัฒนาในเครื่อง
สร้างไฟล์ `.dev.vars`:
```
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
SESSION_SECRET=<สุ่มยาว 64 ตัว>
ADMIN_DISCORD_IDS=<discord id>
DEV_LOGIN=true
```
```bash
npm run db:init:local
npm run dev            # http://127.0.0.1:8788
```
`DEV_LOGIN=true` เปิด `/auth/dev-login` (login เป็นแอดมินโดยไม่ผ่าน Discord) ใช้ได้เฉพาะ localhost — **ห้ามตั้งใน production**

## รูปฮีโร่ / สัตว์เลี้ยง / เซ็ต / แหวน
รูปทั้งหมดเก็บในเว็บเราเอง (`public/img/`, `public/assets.json`) ดาวน์โหลดและย่อขนาดจาก 7K Atlas
```bash
npm run assets            # ดึงฮีโร่/สัตว์เลี้ยงใหม่ (ไฟล์ที่มีแล้วจะข้าม)
npm run assets -- --force # โหลดใหม่ทั้งหมด
```
ชื่อที่ไม่ตรงกับ 7K Atlas (เช่น `เซนอิทสึ`, `รีเซล`) ให้เพิ่มใน `HERO_ALIASES` / `PET_ALIASES` และไอคอนแหวนใน `RINGS` ที่ `scripts/fetch-assets.mjs`

## โครงสร้าง
```
public/            หน้าเว็บ (index.html, app.js, style.css, _headers)
functions/auth/    login / callback / logout (Discord OAuth2) + dev-login
functions/api/     REST API ทั้งหมด ([[path]].js)
lib/               auth, sanitize, util (ใช้ร่วมกันใน functions)
schema.sql         ตาราง D1
```
