"use client";

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { institutionInfo } from "@/roles/shared/data";

const faqs = [
  { category: "บัญชี", question: "หากไม่สามารถเข้าสู่ระบบได้ ต้องทำอย่างไร?", answer: "ตรวจสอบเลขที่ใบประกอบวิชาชีพและรหัสผ่านอีกครั้ง หากยังไม่สามารถเข้าใช้งานได้ กรุณาติดต่อหน่วยงานที่ดูแลทะเบียนสมาชิก" },
  { category: "การลงทะเบียน", question: "ตรวจสอบสถานะการลงทะเบียนได้จากที่ใด?", answer: "เปิดเมนูการลงทะเบียน แล้วเลือกส่วนติดตามสถานะ ระบบจะแสดงขั้นตอนล่าสุดและรายการที่ต้องดำเนินการ" },
  { category: "การเงิน", question: "ชำระเงินแล้วแต่สถานะยังไม่เปลี่ยน ต้องทำอย่างไร?", answer: "ตรวจสอบว่าหลักฐานการชำระเงินถูกส่งครบถ้วน สถานะจะเปลี่ยนหลังตรวจสอบรายการ หากเกินกำหนดให้ติดต่อฝ่ายการเงินพร้อมเลขที่รายการ" },
  { category: "ข้อมูลสมาชิก", question: "ข้อมูลใน Pharmacist Profile ไม่ถูกต้อง แก้ไขอย่างไร?", answer: "ยื่นคำร้องแก้ไขข้อมูลพร้อมเอกสารประกอบจากเมนูคำร้อง ข้อมูลที่ผ่านการตรวจสอบแล้วจะแสดงใน Pharmacist Profile" },
  { category: "ผลการประเมิน", question: "ผลการประเมินยังไม่แสดง หมายความว่าอย่างไร?", answer: "ระบบแสดงเฉพาะผลที่ประกาศแล้ว รายการที่อยู่ระหว่างดำเนินการจะแสดงสถานะโดยไม่เปิดเผยผลก่อนประกาศ" },
];

export default function HelpCenterPage() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("th-TH");
  const visible = faqs.filter((item) => !normalized || `${item.category} ${item.question} ${item.answer}`.toLocaleLowerCase("th-TH").includes(normalized));

  return (
    <PageShell className="space-y-6">
      <div className="relative max-w-2xl"><span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">search</span><Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาคำถามหรือหัวข้อ" aria-label="ค้นหาคำถามที่พบบ่อย" className="h-11 rounded-xl pl-10 text-sm" /></div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card><CardHeader><CardTitle className="text-lg">คำถามที่พบบ่อย</CardTitle></CardHeader><CardContent>
          <Accordion type="single" collapsible>{visible.map((faq, index) => <AccordionItem key={faq.question} value={`faq-${index}`}><AccordionTrigger className="text-left"><span><span className="mb-1 block text-xs font-medium text-primary">{faq.category}</span>{faq.question}</span></AccordionTrigger><AccordionContent className="text-sm leading-6 text-muted-foreground">{faq.answer}</AccordionContent></AccordionItem>)}</Accordion>
          {visible.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">ไม่พบคำถามที่ตรงกับคำค้นหา</div>}
        </CardContent></Card>
        <Card className="h-fit"><CardHeader><CardTitle className="text-lg">ติดต่อหน่วยงาน</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><p className="text-muted-foreground">เตรียมชื่อ เลขที่ใบประกอบวิชาชีพ และรายละเอียดรายการก่อนติดต่อ</p><div><p className="font-medium">โทรศัพท์</p><p className="text-muted-foreground">{institutionInfo.phone} {institutionInfo.phoneExtensions["ราชวิทยาลัย"]}</p></div><div><p className="font-medium">อีเมล</p><p className="break-all text-muted-foreground">{institutionInfo.emails.general}</p></div><Button asChild className="w-full"><a href={`mailto:${institutionInfo.emails.general}`}>ส่งอีเมล</a></Button></CardContent></Card>
      </div>
    </PageShell>
  );
}
