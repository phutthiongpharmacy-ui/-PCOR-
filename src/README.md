# Source structure

โค้ดภายใต้ `src/` แยกตามขอบเขตของ Role และ Workflow:

```text
src/
├── app/             # Next.js routes และ route layouts เท่านั้น
├── components/      # Shared UI primitives (`components/ui/*`)
├── providers/       # Application-wide React providers
├── lib/             # Framework-agnostic shared utilities
└── roles/
    ├── member/      # Student; คงชื่อนี้ไว้ให้ตรงกับ route `/member`
    ├── teacher/     # Teacher และ Course Assignment scope
    ├── institution/ # Institution Admin และ Institution scope
    ├── staff/       # Royal College Staff: งานส่วนกลางและการเงิน
    ├── president/   # President / Signer และ Organisation scope
    ├── admin/       # Super Admin: governance และ system administration
    └── shared/      # Domain และ UI ที่ใช้ข้าม Role
        ├── data/            # ข้อมูลอ้างอิงร่วม
        ├── components/      # layout และ primitive ที่ใช้ร่วม
        ├── brand/           # อัตลักษณ์องค์กรและตราสัญลักษณ์
        ├── features/        # workflow/domain ที่ใช้ข้าม Role
        └── member/domain/   # SSOT ข้อมูลสมาชิก
```

## Role และ route ownership

ระบบมี logged-in Role 6 แบบเท่านั้น:

| Role | Route root | โฟลเดอร์เจ้าของ |
| --- | --- | --- |
| Student | `/member` | `roles/member` |
| Teacher | `/teacher` | `roles/teacher` |
| Institution Admin | `/institution` | `roles/institution` |
| Royal College Staff | `/staff` | `roles/staff` |
| President / Signer | `/president` | `roles/president` |
| Super Admin | `/admin` | `roles/admin` |

Admin เดิมหมายถึง Super Admin ส่วนงานหลักสูตร การสอบ คำร้อง งานวิจัย ใบรับรอง ข่าวสาร Registration Operation การเงิน และการเตรียมเอกสารลงนาม เป็นความรับผิดชอบของ Royal College Staff ภายใต้ `/staff` ไม่มี Finance Officer เป็น Role แยก

Super Admin เข้าถึงเฉพาะ route ด้าน governance ต่อไปนี้: `/admin/dashboard`, `/admin/users`, `/admin/scopes`, `/admin/organisations`, `/admin/terms`, `/admin/integrations`, `/admin/audit` และ `/admin/settings`

ไฟล์ route งานธุรกิจเดิมใต้ `/admin` ยังอยู่ระหว่างการย้ายโครงสร้างเพื่อรักษาประวัติของโค้ด แต่ไม่อยู่ใน Navigation และถูก access gate ปฏิเสธเมื่อเปิด URL โดยตรง งานที่ใช้งานได้จริงต้องเข้าผ่าน `/staff` เท่านั้น

## หลักเกณฑ์

- Route pages (`app/`) เป็น entry point และ import จาก `roles/*`, `providers/*` หรือ `components/ui/*`
- Business logic เฉพาะ Role อยู่ใน `roles/<role>/...`
- Workflow ข้าม Role และ domain state ร่วมอยู่ใน `roles/shared/...`
- สิทธิ์ทุกจุดอิง Role + Organisation Scope + Resource Scope
- Action สำคัญบันทึกลง append-only Audit Log ใน `roles/shared/features/audit`
- Tests อยู่ใกล้ไฟล์ที่เกี่ยวข้อง

## Shared workflows

- `roles/shared/features/academic` จัดการ Course Assignment, Registration review และผล S/U ข้าม Role
- `roles/shared/features/audit` จัดการ User Audit Log แบบ append-only
- `roles/shared/features/license-eligibility` ตรวจเงื่อนไขใบอนุญาตและสถานภาพผู้เข้าศึกษา
- `roles/shared/features/registration` จัดการสถานะคำขอลงทะเบียนและประวัติการพิจารณา
- `roles/shared/features/finance` จัดการใบแจ้งชำระ กำหนดเวลา และค่าปรับค้างชำระ
- `roles/shared/features/requests` จัดการคำร้อง เอกสาร ความเห็น และลำดับการลงนาม
- `roles/shared/features/roles` จัดการบัญชี สิทธิ์ Scope และวาระผู้ดำรงตำแหน่ง
