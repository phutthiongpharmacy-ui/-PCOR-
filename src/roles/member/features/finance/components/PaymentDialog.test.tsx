import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PaymentDialog from "./PaymentDialog";

afterEach(cleanup);

describe("PaymentDialog", () => {
  it("offers only PromptPay and does not show success when submission is rejected", async () => {
    const onSubmitted = vi.fn(() => false);

    render(
      <PaymentDialog
        item={{
          id: "INV-REG-001",
          description: "ค่าลงทะเบียน TEST-101 วิชาทดสอบ",
          amount: 3_000,
          baseAmount: 3_000,
          lateFee: 0,
        }}
        onOpenChange={vi.fn()}
        onSubmitted={onSubmitted}
      />,
    );

    expect(screen.getByRole("heading", { name: "ชำระเงินด้วย PromptPay" })).toBeTruthy();
    expect(screen.queryByText("บัตรเครดิต")).toBeNull();
    expect(screen.queryByText("บัตรเดบิต")).toBeNull();

    const evidence = new File(["proof"], "payment-proof.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Reference No."), {
      target: { value: "PROMPTPAY-REF-001" },
    });
    fireEvent.change(screen.getByLabelText(/หลักฐานการชำระเงิน/, { selector: "input" }), {
      target: { files: [evidence] },
    });
    fireEvent.click(screen.getByRole("button", { name: "ส่งหลักฐานการชำระเงิน" }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith("INV-REG-001", {
      referenceNo: "PROMPTPAY-REF-001",
      evidenceFileName: "payment-proof.png",
      evidenceFileType: "image/png",
      evidenceFileSize: evidence.size,
      evidenceDataUrl: expect.stringMatching(/^data:image\/png;base64,/),
    }));
    expect(screen.queryByText("ส่งหลักฐานการชำระเงินแล้ว")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("สถานะรายการเปลี่ยนแล้ว");
    expect(screen.getByRole("heading", { name: "ชำระเงินด้วย PromptPay" })).toBeTruthy();
  });

  it("announces success and moves focus after the evidence is accepted", async () => {
    render(
      <StrictMode>
        <PaymentDialog
          item={{
            id: "INV-REG-002",
            description: "ค่าลงทะเบียน TEST-102 วิชาทดสอบ",
            amount: 3_000,
            baseAmount: 3_000,
            lateFee: 0,
          }}
          onOpenChange={vi.fn()}
          onSubmitted={() => true}
        />
      </StrictMode>,
    );

    fireEvent.change(screen.getByLabelText("Reference No."), {
      target: { value: "PROMPTPAY-REF-002" },
    });
    fireEvent.change(screen.getByLabelText(/หลักฐานการชำระเงิน/, { selector: "input" }), {
      target: { files: [new File(["proof"], "proof.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "ส่งหลักฐานการชำระเงิน" }));

    const successHeading = await screen.findByRole("heading", { name: "ส่งหลักฐานการชำระเงินแล้ว" });
    await waitFor(() => expect(document.activeElement).toBe(successHeading));
  });
});
